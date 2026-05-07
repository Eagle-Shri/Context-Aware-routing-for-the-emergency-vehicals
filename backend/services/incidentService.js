const db = require('../db/db');
const routingService = require('./routingService');
const activityLogService = require('./activityLogService');

async function getAllIncidents() {
  const result = await db.query(
    `SELECT id, type, severity, latitude, longitude, impact_radius, description, resolved, created_at
     FROM incidents ORDER BY created_at DESC`
  );
  return result.rows;
}

async function getActiveIncidents() {
  const result = await db.query(
    `SELECT id, type, severity, latitude, longitude, impact_radius, description, created_at
     FROM incidents WHERE resolved = false ORDER BY severity DESC, created_at DESC`
  );
  return result.rows;
}

async function getIncidentById(id) {
  const result = await db.query(
    `SELECT id, type, severity, latitude, longitude, impact_radius, description, resolved, created_at
     FROM incidents WHERE id = $1`, [id]
  );
  return result.rows[0] || null;
}

async function createIncident(type, severity, latitude, longitude, impactRadius, description = '', io) {
  const VALID_TYPES = ['traffic', 'accident', 'roadblock', 'signal', 'vip', 'waterlogging', 'breakdown', 'rally'];
  const normalizedType = VALID_TYPES.includes(type) ? type : 'traffic';

  if (!['low', 'medium', 'high'].includes(severity)) throw new Error('Invalid severity level');

  const result = await db.query(
    `INSERT INTO incidents (type, severity, latitude, longitude, impact_radius, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, type, severity, latitude, longitude, impact_radius, description, created_at`,
    [normalizedType, severity, latitude, longitude, impactRadius, description]
  );

  const incident = result.rows[0];
  console.log(`[Incident] Created #${incident.id}: ${type} (${severity}) at ${latitude},${longitude}`);

  // Log activity
  await activityLogService.logActivity(
    null,
    'system',
    'CREATE',
    'incident',
    incident.id,
    { type: normalizedType, severity, latitude, longitude, description }
  );

  if (io) {
    io.emit('incident_added', { incident, timestamp: new Date().toISOString() });
  }

  await triggerReroutingForIncident(incident, io);
  return incident;
}

/**
 * Trigger rerouting for all ACTIVE ambulances whose stored route passes through the incident zone.
 * Uses actual stored route coordinates (not just start/end points).
 */
async function triggerReroutingForIncident(incident, io) {
  try {
    const result = await db.query(
      `SELECT id, latitude, longitude, destination_lat, destination_lng, current_route
       FROM ambulances WHERE status = 'ACTIVE' AND destination_lat IS NOT NULL`
    );

    for (const ambulance of result.rows) {
      try {
        // Extract actual stored route coordinates (OSRM [lng,lat] format)
        let routeCoords = [];
        if (ambulance.current_route) {
          const route = typeof ambulance.current_route === 'string'
            ? JSON.parse(ambulance.current_route) : ambulance.current_route;
          routeCoords = route.coordinates || route.geometry?.coordinates || [];
        }
        // Fall back to straight-line if no stored route
        if (!routeCoords || routeCoords.length < 2) {
          routeCoords = [
            [parseFloat(ambulance.longitude), parseFloat(ambulance.latitude)],
            [parseFloat(ambulance.destination_lng), parseFloat(ambulance.destination_lat)],
          ];
        }

        const check = await routingService.isRouteAffected(routeCoords);

        if (check.affected) {
          console.log(`[Incident] Ambulance #${ambulance.id} route affected by incident #${incident.id} — rerouting…`);

          // Clear old cache so rerouting gets fresh bypass
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
              trigger: 'incident',
              incident_id: incident.id,
              rerouted: newRoute.rerouted,
              avoided_count: newRoute.avoided_count || 0,
              timestamp: new Date().toISOString()
            });
          }
          console.log(`[Incident] Ambulance #${ambulance.id} rerouted. Rerouted: ${newRoute.rerouted}, Avoided: ${newRoute.avoided_count}`);
        } else {
          console.log(`[Incident] Ambulance #${ambulance.id} route not affected.`);
        }
      } catch (err) {
        console.error(`[Incident] Error rerouting ambulance #${ambulance.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Incident] triggerReroutingForIncident error:', err.message);
  }
}

async function resolveIncident(id, io) {
  const result = await db.query(
    `UPDATE incidents SET resolved=true WHERE id=$1
     RETURNING id, type, severity, latitude, longitude, impact_radius`, [id]
  );
  if (!result.rows[0]) throw new Error(`Incident ${id} not found`);
  if (io) io.emit('incident_resolved', { incident_id: id, timestamp: new Date().toISOString() });
  await triggerReroutingForAllActiveAmbulances(io, `incident_resolved:${id}`);
  return result.rows[0];
}

async function triggerReroutingForAllActiveAmbulances(io, trigger) {
  try {
    const result = await db.query(
      `SELECT id, latitude, longitude, destination_lat, destination_lng, current_route
       FROM ambulances WHERE status = 'ACTIVE' AND destination_lat IS NOT NULL`
    );
    for (const ambulance of result.rows) {
      try {
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
            trigger,
            rerouted: newRoute.rerouted,
            avoided_count: newRoute.avoided_count || 0,
            timestamp: new Date().toISOString()
          });
        }
        console.log(`[Incident] Ambulance #${ambulance.id} re-evaluated after ${trigger}. Rerouted: ${newRoute.rerouted}`);
      } catch (err) {
        console.error(`[Incident] Error re-evaluating route for ambulance #${ambulance.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Incident] triggerReroutingForAllActiveAmbulances error:', err.message);
  }
}

async function getIncidentsBySeverity(severity) {
  const result = await db.query(
    `SELECT id, type, severity, latitude, longitude, impact_radius, description, resolved, created_at
     FROM incidents WHERE severity=$1 AND resolved=false ORDER BY created_at DESC`, [severity]
  );
  return result.rows;
}

async function deleteIncident(id, io) {
  const result = await db.query('DELETE FROM incidents WHERE id=$1 RETURNING id', [id]);
  if (!result.rows[0]) throw new Error(`Incident ${id} not found`);
  if (io) io.emit('incident_deleted', { incident_id: id, timestamp: new Date().toISOString() });
  await triggerReroutingForAllActiveAmbulances(io, `incident_deleted:${id}`);
  return true;
}

module.exports = {
  getAllIncidents, getActiveIncidents, getIncidentById,
  createIncident, resolveIncident, getIncidentsBySeverity,
  deleteIncident, triggerReroutingForIncident, triggerReroutingForAllActiveAmbulances
};
