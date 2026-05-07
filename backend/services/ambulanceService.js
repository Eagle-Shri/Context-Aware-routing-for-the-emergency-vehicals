const db = require('../db/db');
const routingService = require('./routingService');
const activityLogService = require('./activityLogService');

async function getAllAmbulances() {
  const result = await db.query(
    `SELECT id, driver_name, status, latitude, longitude, destination,
            destination_lat, destination_lng, source_name, source_lat, source_lng,
            last_updated, created_at
     FROM ambulances ORDER BY last_updated DESC`
  );
  return result.rows;
}

async function getAmbulanceById(id) {
  const result = await db.query(
    `SELECT id, driver_name, status, latitude, longitude, destination,
            destination_lat, destination_lng, source_name, source_lat, source_lng,
            current_route, last_updated, created_at
     FROM ambulances WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function createAmbulance(driverName, initialLat, initialLng) {
  const result = await db.query(
    `INSERT INTO ambulances (driver_name, status, latitude, longitude)
     VALUES ($1, $2, $3, $4)
     RETURNING id, driver_name, status, latitude, longitude, created_at`,
    [driverName, 'IDLE', initialLat, initialLng]
  );
  const ambulance = result.rows[0];
  console.log(`[Ambulance] Created #${ambulance.id}: ${driverName}`);
  
  // Log activity
  await activityLogService.logActivity(
    null,
    'system',
    'CREATE',
    'ambulance',
    ambulance.id,
    { driver_name: driverName, latitude: initialLat, longitude: initialLng }
  );
  
  return ambulance;
}

async function updateAmbulanceLocation(id, latitude, longitude, io) {
  const ambulance = await getAmbulanceById(id);
  if (!ambulance) throw new Error(`Ambulance ${id} not found`);

  const result = await db.query(
    `UPDATE ambulances SET latitude=$1, longitude=$2, last_updated=CURRENT_TIMESTAMP
     WHERE id=$3
     RETURNING id, driver_name, status, latitude, longitude,
               destination_lat, destination_lng, current_route, last_updated`,
    [latitude, longitude, id]
  );
  const updated = result.rows[0];

  // If ACTIVE with destination, check for deviation and reroute
  if (updated.status === 'ACTIVE' && updated.destination_lat) {
    const routeCoords = ambulance.current_route?.coordinates || [];
    if (routingService.hasAmbulanceDeviated(latitude, longitude, routeCoords)) {
      console.log(`[Ambulance] #${id} deviated from route, recalculating…`);
      try {
        const newRoute = await routingService.getBestRoute(
          { lat: latitude, lng: longitude },
          { lat: updated.destination_lat, lng: updated.destination_lng },
          id
        );
        await db.query('UPDATE ambulances SET current_route=$1 WHERE id=$2', [JSON.stringify(newRoute), id]);
        if (io) {
          io.emit('route_updated', {
            ambulance_id: id, route: newRoute,
            trigger: 'deviation', timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error(`[Ambulance] Reroute error #${id}:`, err.message);
      }
    }
  }

  if (io) {
    io.emit('ambulance_location_update', {
      ambulance_id: id, latitude, longitude,
      status: updated.status,
      destination: ambulance.destination || null,
      timestamp: new Date().toISOString()
    });
  }
  return updated;
}

async function updateAmbulanceStatus(id, status) {
  if (!['IDLE', 'ACTIVE', 'BUSY'].includes(status)) throw new Error('Invalid status');
  const result = await db.query(
    `UPDATE ambulances SET status=$1, last_updated=CURRENT_TIMESTAMP
     WHERE id=$2 RETURNING id, driver_name, status, latitude, longitude, last_updated`,
    [status, id]
  );
  if (!result.rows[0]) throw new Error(`Ambulance ${id} not found`);
  console.log(`[Ambulance] #${id} status → ${status}`);
  
  // Log activity
  await activityLogService.logActivity(
    null,
    'system',
    'UPDATE_STATUS',
    'ambulance',
    id,
    { status }
  );
  
  return result.rows[0];
}

async function assignDestination(id, destination, lat, lng, sourceName, srcLat, srcLng) {
  const result = await db.query(
    `UPDATE ambulances
     SET destination=$1, destination_lat=$2, destination_lng=$3,
         source_name=$4, source_lat=$5, source_lng=$6,
         status='ACTIVE', last_updated=CURRENT_TIMESTAMP
     WHERE id=$7
     RETURNING id, driver_name, status, latitude, longitude,
               destination, destination_lat, destination_lng,
               source_name, source_lat, source_lng, last_updated`,
    [destination, lat, lng, sourceName || null, srcLat || null, srcLng || null, id]
  );
  if (!result.rows[0]) throw new Error(`Ambulance ${id} not found`);
  console.log(`[Ambulance] #${id} assigned dest: ${destination}`);
  
  // Log activity
  await activityLogService.logActivity(
    null,
    'system',
    'ASSIGN_DESTINATION',
    'ambulance',
    id,
    { destination, destination_lat: lat, destination_lng: lng, source_name: sourceName }
  );
  
  return result.rows[0];
}

async function clearDestination(id) {
  const result = await db.query(
    `UPDATE ambulances
     SET destination=NULL, destination_lat=NULL, destination_lng=NULL,
         source_name=NULL, source_lat=NULL, source_lng=NULL,
         status='IDLE', current_route=NULL, last_updated=CURRENT_TIMESTAMP
     WHERE id=$1
     RETURNING id, driver_name, status, latitude, longitude, last_updated`,
    [id]
  );
  if (!result.rows[0]) throw new Error(`Ambulance ${id} not found`);
  console.log(`[Ambulance] #${id} destination cleared`);
  
  // Log activity
  await activityLogService.logActivity(
    null,
    'system',
    'CLEAR_DESTINATION',
    'ambulance',
    id,
    {}
  );
  
  return result.rows[0];
}

async function getAmbulancesByStatus(status) {
  const result = await db.query(
    `SELECT id, driver_name, status, latitude, longitude, destination, last_updated
     FROM ambulances WHERE status=$1 ORDER BY last_updated DESC`,
    [status]
  );
  return result.rows;
}

async function findNearestIdleAmbulance(lat, lng) {
  const result = await db.query(
    `SELECT id, driver_name, latitude, longitude,
            SQRT(POWER(latitude-$1,2)+POWER(longitude-$2,2)) as distance
     FROM ambulances WHERE status='IDLE' ORDER BY distance ASC LIMIT 1`,
    [lat, lng]
  );
  return result.rows[0] || null;
}

async function deleteAmbulance(id) {
  const result = await db.query('DELETE FROM ambulances WHERE id=$1 RETURNING id', [id]);
  if (!result.rows[0]) throw new Error(`Ambulance ${id} not found`);
  console.log(`[Ambulance] Deleted #${id}`);
  
  // Log activity
  await activityLogService.logActivity(
    null,
    'system',
    'DELETE',
    'ambulance',
    id,
    {}
  );
  
  return true;
}

module.exports = {
  getAllAmbulances, getAmbulanceById, createAmbulance,
  updateAmbulanceLocation, updateAmbulanceStatus,
  assignDestination, clearDestination,
  getAmbulancesByStatus, findNearestIdleAmbulance, deleteAmbulance
};
