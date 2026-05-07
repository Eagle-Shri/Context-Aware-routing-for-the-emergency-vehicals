const db = require('../db/db');
const routingService = require('./routingService');
const activityLogService = require('./activityLogService');

async function getAllPoliceUpdates() {
  const result = await db.query(
    `SELECT id, road_name, status, severity, latitude, longitude,
            impact_radius, expected_clearance, description, created_at
     FROM police_updates ORDER BY created_at DESC`
  );
  return result.rows;
}

async function getActivePoliceUpdates() {
  const result = await db.query(
    `SELECT id, road_name, status, severity, latitude, longitude,
            impact_radius, expected_clearance, description, created_at
     FROM police_updates WHERE status = 'blocked'
     ORDER BY severity DESC, created_at DESC`
  );
  return result.rows;
}

async function updatePoliceStatus(roadName, status, severity, latitude, longitude, impactRadius, expectedClearance = null, description = '', io) {
  if (!['open', 'blocked'].includes(status)) throw new Error('Invalid status');
  if (!['low', 'medium', 'high'].includes(severity)) throw new Error('Invalid severity level');

  const existing = await db.query(
    `SELECT id FROM police_updates WHERE road_name = $1 AND status = $2 LIMIT 1`,
    [roadName, status]
  );

  let result;
  if (existing.rows.length > 0) {
    result = await db.query(
      `UPDATE police_updates SET status=$1, severity=$2, latitude=$3, longitude=$4,
       impact_radius=$5, expected_clearance=$6, description=$7 WHERE road_name=$8
       RETURNING id, road_name, status, severity, latitude, longitude, impact_radius, expected_clearance, description, created_at`,
      [status, severity, latitude, longitude, impactRadius, expectedClearance, description, roadName]
    );
  } else {
    result = await db.query(
      `INSERT INTO police_updates (road_name, status, severity, latitude, longitude, impact_radius, expected_clearance, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, road_name, status, severity, latitude, longitude, impact_radius, expected_clearance, description, created_at`,
      [roadName, status, severity, latitude, longitude, impactRadius, expectedClearance, description]
    );
  }

  const update = result.rows[0];
  
  // Log activity
  await activityLogService.logActivity(
    null,
    'police',
    existing.rows.length > 0 ? 'UPDATE' : 'CREATE',
    'police_update',
    update.id,
    { road_name: roadName, status, severity, latitude, longitude, description }
  );
  
  if (io) io.emit('police_update', { update, timestamp: new Date().toISOString() });
  if (status === 'blocked') await triggerReroutingForPoliceUpdate(update, io);
  return update;
}

/**
 * Trigger rerouting for ACTIVE ambulances whose STORED ROUTE passes through the blocked road zone.
 * Uses actual route coordinates from DB (OSRM [lng,lat] format), not just start/end points.
 */
async function triggerReroutingForPoliceUpdate(policeUpdate, io) {
  try {
    const result = await db.query(
      `SELECT id, latitude, longitude, destination_lat, destination_lng, current_route
       FROM ambulances WHERE status = 'ACTIVE' AND destination_lat IS NOT NULL`
    );

    for (const ambulance of result.rows) {
      try {
        // Use actual stored route coordinates (OSRM [lng,lat] format)
        let routeCoords = [];
        if (ambulance.current_route) {
          const route = typeof ambulance.current_route === 'string'
            ? JSON.parse(ambulance.current_route) : ambulance.current_route;
          routeCoords = route.coordinates || route.geometry?.coordinates || [];
        }
        if (!routeCoords || routeCoords.length < 2) {
          // Fall back to [lng,lat] format straight-line check
          routeCoords = [
            [parseFloat(ambulance.longitude), parseFloat(ambulance.latitude)],
            [parseFloat(ambulance.destination_lng), parseFloat(ambulance.destination_lat)],
          ];
        }

        const check = await routingService.isRouteAffected(routeCoords);
        const hasBlockedRoad = check.conflicts.some(c => c.type === 'blocked_road');

        if (check.affected && hasBlockedRoad) {
          console.log(`[Police] Ambulance #${ambulance.id} route passes through blocked road — rerouting…`);

          await routingService.clearAmbulanceCache(ambulance.id);

          const newRoute = await routingService.getBestRoute(
            { lat: parseFloat(ambulance.latitude), lng: parseFloat(ambulance.longitude) },
            { lat: parseFloat(ambulance.destination_lat), lng: parseFloat(ambulance.destination_lng) },
            ambulance.id
          );

          await db.query('UPDATE ambulances SET current_route=$1 WHERE id=$2',
            [JSON.stringify(newRoute), ambulance.id]);

          if (io) {
            io.emit('route_updated', {
              ambulance_id: ambulance.id,
              route: newRoute,
              trigger: 'police_update',
              police_update_id: policeUpdate.id,
              rerouted: newRoute.rerouted,
              avoided_count: newRoute.avoided_count || 0,
              timestamp: new Date().toISOString()
            });
          }
          console.log(`[Police] Ambulance #${ambulance.id} rerouted. Avoided: ${newRoute.avoided_count}`);
        }
      } catch (err) {
        console.error(`[Police] Error rerouting ambulance #${ambulance.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Police] triggerReroutingForPoliceUpdate error:', err.message);
  }
}

async function clearPoliceUpdate(id, io) {
  const result = await db.query(
    `UPDATE police_updates SET status='open' WHERE id=$1
     RETURNING id, road_name, status, severity, latitude, longitude`, [id]
  );
  if (!result.rows[0]) throw new Error(`Police update ${id} not found`);
  if (io) io.emit('police_update_cleared', { update_id: id, timestamp: new Date().toISOString() });
  return result.rows[0];
}

async function getPoliceUpdatesByRoad(roadName) {
  const result = await db.query(
    `SELECT id, road_name, status, severity, latitude, longitude, impact_radius, expected_clearance, description, created_at
     FROM police_updates WHERE road_name=$1 ORDER BY created_at DESC`, [roadName]
  );
  return result.rows;
}

async function deletePoliceUpdate(id) {
  const result = await db.query('DELETE FROM police_updates WHERE id=$1 RETURNING id', [id]);
  if (!result.rows[0]) throw new Error(`Police update ${id} not found`);
  return true;
}

module.exports = {
  getAllPoliceUpdates, getActivePoliceUpdates, updatePoliceStatus,
  clearPoliceUpdate, getPoliceUpdatesByRoad, deletePoliceUpdate,
  triggerReroutingForPoliceUpdate
};
