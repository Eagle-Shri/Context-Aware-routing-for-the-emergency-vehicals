const axios = require('axios');
const db = require('../db/db');

const OSRM_API_URL = process.env.OSRM_API_URL || 'http://router.project-osrm.org';
const CACHE_DURATION_MS = 60 * 1000;

// ── Haversine distance (km) ──────────────────────────────────────────────────
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Interpolate points to prevent long straight segments from hiding collisions ──
function densifyRoute(coords, maxSegKm = 0.05) {
  if (!coords || coords.length < 2) return coords;
  const dense = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const dist = getDistance(lat1, lng1, lat2, lng2);
    if (dist > maxSegKm) {
      const steps = Math.ceil(dist / maxSegKm);
      for (let j = 1; j < steps; j++) {
        const fraction = j / steps;
        dense.push([
          lng1 + (lng2 - lng1) * fraction,
          lat1 + (lat2 - lat1) * fraction
        ]);
      }
    }
    dense.push([lng2, lat2]);
  }
  return dense;
}

// ── DB helpers ───────────────────────────────────────────────────────────────
async function getActiveBlockers() {
  const [incRes, polRes] = await Promise.all([
    db.query('SELECT * FROM incidents WHERE resolved = false'),
    db.query("SELECT * FROM police_updates WHERE status = 'blocked'"),
  ]);
  return { incidents: incRes.rows, blockedRoads: polRes.rows };
}

// ── Conflict checks ──────────────────────────────────────────────────────────
async function isRouteAffected(routeCoordinates) {
  try {
    const { incidents, blockedRoads } = await getActiveBlockers();
    const conflicts = [];

    const denseCoords = densifyRoute(routeCoordinates);

    for (const inc of incidents) {
      const r = (inc.impact_radius || 300) / 1000;
      for (const [lng, lat] of denseCoords) {
        if (getDistance(lat, lng, parseFloat(inc.latitude), parseFloat(inc.longitude)) <= r) {
          conflicts.push({ type: 'incident', id: inc.id, lat: parseFloat(inc.latitude), lng: parseFloat(inc.longitude), radius: inc.impact_radius });
          break;
        }
      }
    }
    for (const rd of blockedRoads) {
      const r = (rd.impact_radius || 500) / 1000;
      for (const [lng, lat] of denseCoords) {
        if (getDistance(lat, lng, rd.latitude, rd.longitude) <= r) {
          conflicts.push({ type: 'blocked_road', id: rd.id, lat: rd.latitude, lng: rd.longitude, radius: rd.impact_radius });
          break;
        }
      }
    }
    return { affected: conflicts.length > 0, conflicts };
  } catch (err) {
    console.error('[Routing] isRouteAffected error:', err.message);
    return { affected: false, conflicts: [] };
  }
}

function countConflictsSync(coords, incidents, blockedRoads) {
  let count = 0;
  const denseCoords = densifyRoute(coords);
  for (const inc of incidents) {
    const r = (inc.impact_radius || 300) / 1000;
    if (denseCoords.some(([lng, lat]) => getDistance(lat, lng, parseFloat(inc.latitude), parseFloat(inc.longitude)) <= r)) count++;
  }
  for (const rd of blockedRoads) {
    const r = (rd.impact_radius || 500) / 1000;
    if (denseCoords.some(([lng, lat]) => getDistance(lat, lng, rd.latitude, rd.longitude) <= r)) count++;
  }
  return count;
}

// ── OSRM helpers ─────────────────────────────────────────────────────────────
async function callOSRM(srcLat, srcLng, dstLat, dstLng, waypoints = []) {
  let coords = `${srcLng},${srcLat}`;
  for (const wp of waypoints) coords += `;${wp.lng},${wp.lat}`;
  coords += `;${dstLng},${dstLat}`;

  const res = await axios.get(`${OSRM_API_URL}/route/v1/driving/${coords}`, {
    params: { overview: 'full', geometries: 'geojson', steps: false },
    timeout: 12000,
  });
  if (res.data.code !== 'Ok' || !res.data.routes.length) throw new Error('No OSRM route');
  return res.data.routes[0];
}

async function callOSRMAlternatives(srcLat, srcLng, dstLat, dstLng) {
  const coords = `${srcLng},${srcLat};${dstLng},${dstLat}`;
  const res = await axios.get(`${OSRM_API_URL}/route/v1/driving/${coords}`, {
    params: { overview: 'full', geometries: 'geojson', steps: false, alternatives: 5 },
    timeout: 12000,
  });
  if (res.data.code !== 'Ok') throw new Error('OSRM alternatives failed');
  return res.data.routes || [];
}

// ── Snap a point to road; only return if outside the exclusion circle ─────────
async function snapToRoadOutside(lat, lng, exLat, exLng, minDistKm) {
  try {
    const res = await axios.get(`${OSRM_API_URL}/nearest/v1/driving/${lng},${lat}`, {
      params: { number: 10 },
      timeout: 6000,
    });
    if (res.data.code !== 'Ok') return null;
    for (const wp of (res.data.waypoints || [])) {
      const [sLng, sLat] = wp.location;
      if (getDistance(sLat, sLng, exLat, exLng) >= minDistKm) {
        return { lat: sLat, lng: sLng };
      }
    }
    return null;
  } catch { return null; }
}

// ── Insert a waypoint at the best position in an ordered waypoint list ────────
// Finds the position in the existing waypoint list (including src/dst) where
// the new candidate fits most naturally (closest to the conflict on the route).
function insertWaypointForConflict(existingWaypoints, candidateWp, srcLat, srcLng, dstLat, dstLng) {
  // Build the full ordered list: src → ...waypoints → dst
  const ordered = [
    { lat: srcLat, lng: srcLng },
    ...existingWaypoints,
    { lat: dstLat, lng: dstLng },
  ];

  // Find the segment closest to the candidate
  let bestInsertIdx = 1; // default: insert right after src
  let minDist = Infinity;
  for (let i = 0; i < ordered.length - 1; i++) {
    const segMidLat = (ordered[i].lat + ordered[i + 1].lat) / 2;
    const segMidLng = (ordered[i].lng + ordered[i + 1].lng) / 2;
    const d = getDistance(candidateWp.lat, candidateWp.lng, segMidLat, segMidLng);
    if (d < minDist) { minDist = d; bestInsertIdx = i + 1; }
  }

  // Insert at the best position (excluding src/dst which are index 0 and last)
  const result = [...existingWaypoints];
  result.splice(bestInsertIdx - 1, 0, candidateWp); // -1 because existingWaypoints doesn't include src
  return result;
}

// ── Find a bypass waypoint for ONE conflict, aware of ALL accumulated waypoints ─
// The candidate is inserted at the correct position, and the FULL multi-waypoint
// route is tested to ensure this conflict is avoided without re-introducing others.
async function findBypassForConflict(conflict, srcLat, srcLng, dstLat, dstLng, existingWaypoints = []) {
  const { lat: bLat, lng: bLng, radius: rawRadius } = conflict;
  const radiusKm = (rawRadius || 300) / 1000;
  const safeMinKm = radiusKm + 0.1; // Just 100m outside the radius

  const distancesKm = [
    safeMinKm + 0.1,
    safeMinKm + 0.3,
    safeMinKm + 0.6,
    safeMinKm + 1.0,
    safeMinKm + 2.0,
  ];

  const bearings = Array.from({ length: 16 }, (_, i) => (i * 22.5 * Math.PI) / 180);
  const dx = dstLng - srcLng, dy = dstLat - srcLat;
  const routeAngle = Math.atan2(dx, dy);
  const perpBearings = [routeAngle + Math.PI / 2, routeAngle - Math.PI / 2];
  const allBearings = [...perpBearings, ...bearings];

  for (const distKm of distancesKm) {
    const degOffset = distKm / 111;
    for (const bearing of allBearings) {
      const cLat = bLat + degOffset * Math.cos(bearing);
      const cLng = bLng + degOffset * Math.sin(bearing) / Math.cos((bLat * Math.PI) / 180);

      const snapped = await snapToRoadOutside(cLat, cLng, bLat, bLng, safeMinKm);
      if (!snapped) continue;

      // Build the combined waypoints: existing + this candidate, ordered by route position
      const combinedWaypoints = insertWaypointForConflict(existingWaypoints, snapped, srcLat, srcLng, dstLat, dstLng);

      try {
        // Test the FULL route with ALL accumulated waypoints
        const testRoute = await callOSRM(srcLat, srcLng, dstLat, dstLng, combinedWaypoints);
        // Only verify THIS conflict is cleared — other conflicts handled in other iterations
        const denseTest = densifyRoute(testRoute.geometry.coordinates);
        const stillHitsThisConflict = denseTest.some(([lng, lat]) =>
          getDistance(lat, lng, bLat, bLng) <= radiusKm
        );

        if (!stillHitsThisConflict) {
          console.log(`[Routing] ✓ Bypass for conflict@(${bLat.toFixed(4)},${bLng.toFixed(4)}) at ${distKm.toFixed(1)}km bearing=${((bearing * 180) / Math.PI).toFixed(0)}°`);
          return snapped; // caller will insert it properly
        }
      } catch { /* try next candidate */ }
    }
  }
  return null;
}

// Keep old name as alias for backward compatibility
async function findBypassForRoute(conflict, srcLat, srcLng, dstLat, dstLng) {
  return findBypassForConflict(conflict, srcLat, srcLng, dstLat, dstLng, []);
}

// ── Cache ────────────────────────────────────────────────────────────────────
async function getCachedRoute(ambulanceId, srcLat, srcLng, dstLat, dstLng) {
  if (!ambulanceId) return null;
  try {
    const r = await db.query(
      `SELECT route_data, created_at FROM route_cache
       WHERE ambulance_id=$1 AND source_lat=$2 AND source_lng=$3 AND dest_lat=$4 AND dest_lng=$5
       ORDER BY created_at DESC LIMIT 1`,
      [ambulanceId, srcLat, srcLng, dstLat, dstLng]
    );
    if (r.rows.length && Date.now() - new Date(r.rows[0].created_at).getTime() < CACHE_DURATION_MS)
      return r.rows[0].route_data;
  } catch {}
  return null;
}

async function cacheRoute(ambulanceId, srcLat, srcLng, dstLat, dstLng, data) {
  if (!ambulanceId) return;
  try {
    await db.query(
      `INSERT INTO route_cache (ambulance_id, source_lat, source_lng, dest_lat, dest_lng, route_data)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (ambulance_id, source_lat, source_lng, dest_lat, dest_lng)
       DO UPDATE SET route_data=$6, created_at=CURRENT_TIMESTAMP`,
      [ambulanceId, srcLat, srcLng, dstLat, dstLng, JSON.stringify(data)]
    );
  } catch (err) { console.error('[Routing] cacheRoute:', err.message); }
}

function buildResult(osrm, check, rerouted, avoided = 0) {
  return {
    geometry: osrm.geometry,
    distance: osrm.distance,
    duration: osrm.duration,
    coordinates: osrm.geometry.coordinates,
    affected: check.affected,
    conflicts: check.conflicts,
    avoided_count: avoided,
    rerouted,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────
async function getBestRoute(source, destination, ambulanceId = null) {
  const { lat: srcLat, lng: srcLng } = source;
  const { lat: dstLat, lng: dstLng } = destination;

  console.log(`[Routing] ${srcLat},${srcLng} → ${dstLat},${dstLng} (amb:${ambulanceId || 'anon'})`);

  // ── Initial route ──────────────────────────────────────────────────────────
  const initial = await callOSRM(srcLat, srcLng, dstLat, dstLng);
  const check = await isRouteAffected(initial.geometry.coordinates);

  if (!check.affected) {
    console.log(`[Routing] Clear route ${(initial.distance / 1000).toFixed(1)}km`);
    const rd = buildResult(initial, check, false);
    await cacheRoute(ambulanceId, srcLat, srcLng, dstLat, dstLng, rd);
    return rd;
  }

  console.log(`[Routing] ${check.conflicts.length} conflict(s): ${check.conflicts.map(c => `${c.type}#${c.id}`).join(', ')}`);

  const blockers = await getActiveBlockers();

  // ── Strategy A: OSRM alternatives ─────────────────────────────────────────
  try {
    const alts = await callOSRMAlternatives(srcLat, srcLng, dstLat, dstLng);
    console.log(`[Routing] OSRM returned ${alts.length} route(s)`);
    let best = null, bestCount = check.conflicts.length;
    for (const alt of alts) {
      const cnt = countConflictsSync(alt.geometry.coordinates, blockers.incidents, blockers.blockedRoads);
      console.log(`[Routing] Alt ${(alt.distance / 1000).toFixed(1)}km conflicts=${cnt}`);
      if (cnt < bestCount) { bestCount = cnt; best = alt; }
      if (bestCount === 0) break;
    }
    if (best && bestCount === 0) {
      const altCheck = await isRouteAffected(best.geometry.coordinates);
      const avoided = check.conflicts.length;
      console.log(`[Routing] Strategy A: avoided ${avoided} conflict(s) (All cleared)`);
      const rd = buildResult(best, altCheck, true, avoided);
      await cacheRoute(ambulanceId, srcLat, srcLng, dstLat, dstLng, rd);
      return rd;
    } else if (best) {
      console.log(`[Routing] Strategy A: found partial fix (${bestCount} conflicts remain), falling through to Strategy B...`);
    }
  } catch (e) { console.warn('[Routing] Strategy A error:', e.message); }

  // ── Strategy B: iterative multi-conflict bypass (one conflict per pass) ───────
  // Each pass finds a bypass for ONE remaining conflict, inserts it into the
  // combined waypoint list at the correct route-position, and re-tests ALL conflicts.
  // This guarantees that accumulated bypasses don't re-introduce earlier conflicts.
  console.log(`[Routing] Strategy B: targeting ${check.conflicts.length} conflict(s) iteratively…`);
  let waypoints = [];
  let currentRoute = initial;
  let currentCheck = check;

  for (let i = 0; i < 5; i++) { // Up to 5 conflicts
    if (!currentCheck.affected) break;

    let bypassFound = false;
    for (const conflict of currentCheck.conflicts) {
      // Pass existing waypoints so the candidate is tested against the combined route
      const bypass = await findBypassForConflict(conflict, srcLat, srcLng, dstLat, dstLng, waypoints);
      if (!bypass) {
        console.warn(`[Routing] No bypass for ${conflict.type}#${conflict.id}`);
        continue;
      }

      // Insert the new waypoint at the correct position in the ordered list
      waypoints = insertWaypointForConflict(waypoints, bypass, srcLat, srcLng, dstLat, dstLng);
      bypassFound = true;
      break; // one bypass per iteration — re-test the full route before next conflict
    }

    if (!bypassFound) break; // can't bypass remaining conflicts

    try {
      const newRoute = await callOSRM(srcLat, srcLng, dstLat, dstLng, waypoints);
      const reCheck = await isRouteAffected(newRoute.geometry.coordinates);
      const remaining = reCheck.conflicts.length;
      const avoided = check.conflicts.length - remaining;
      console.log(`[Routing] Strategy B pass ${i + 1}: ${(newRoute.distance / 1000).toFixed(1)}km, avoided ${avoided}/${check.conflicts.length} conflict(s), ${remaining} remaining`);

      currentRoute = newRoute;
      currentCheck = reCheck;

      if (!reCheck.affected) {
        // All conflicts cleared!
        const rd = buildResult(newRoute, reCheck, true, check.conflicts.length);
        await cacheRoute(ambulanceId, srcLat, srcLng, dstLat, dstLng, rd);
        console.log(`[Routing] ✅ Strategy B: fully cleared all ${check.conflicts.length} conflict(s)`);
        return rd;
      }
    } catch (e) {
      console.warn('[Routing] Strategy B OSRM call failed:', e.message);
      break;
    }
  }

  // Return the best partial result if we made any progress
  if (currentRoute !== initial) {
    const avoided = check.conflicts.length - currentCheck.conflicts.length;
    console.log(`[Routing] Strategy B (partial): avoided ${avoided}/${check.conflicts.length} conflict(s)`);
    const rd = buildResult(currentRoute, currentCheck, true, avoided);
    await cacheRoute(ambulanceId, srcLat, srcLng, dstLat, dstLng, rd);
    return rd;
  }


  // ── Fallback ───────────────────────────────────────────────────────────────
  console.warn('[Routing] All strategies exhausted — returning original route (flagged)');
  const rd = buildResult(initial, check, true, 0);
  await cacheRoute(ambulanceId, srcLat, srcLng, dstLat, dstLng, rd);
  return rd;
}

async function clearAmbulanceCache(ambulanceId) {
  try { await db.query('DELETE FROM route_cache WHERE ambulance_id=$1', [ambulanceId]); } catch {}
}
async function clearAllCache() {
  try { await db.query('DELETE FROM route_cache'); } catch {}
}

function hasAmbulanceDeviated(lat, lng, routeCoords, maxDistKm = 0.1) {
  if (!routeCoords || routeCoords.length === 0) return false;
  let minDist = Infinity;
  for (const [rLng, rLat] of routeCoords) {
    const dist = getDistance(lat, lng, rLat, rLng);
    if (dist < minDist) minDist = dist;
  }
  return minDist > maxDistKm;
}

module.exports = { getBestRoute, isRouteAffected, clearAmbulanceCache, clearAllCache, getDistance, hasAmbulanceDeviated };
