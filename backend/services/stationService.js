const db = require('../db/db');

/**
 * Get all police stations
 */
async function getAllStations() {
  try {
    const result = await db.query(
      `SELECT id, name, zone, latitude, longitude, address, phone, created_at
       FROM police_stations 
       ORDER BY name ASC`
    );
    return result.rows;
  } catch (err) {
    console.error('[Police Station] Error fetching stations:', err.message);
    throw err;
  }
}

/**
 * Get station by ID
 */
async function getStationById(id) {
  try {
    const result = await db.query(
      `SELECT id, name, zone, latitude, longitude, address, phone, created_at
       FROM police_stations 
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Police Station] Error fetching station by ID:', err.message);
    throw err;
  }
}

/**
 * Get stations by zone
 */
async function getStationsByZone(zone) {
  try {
    const result = await db.query(
      `SELECT id, name, zone, latitude, longitude, address, phone, created_at
       FROM police_stations 
       WHERE zone = $1
       ORDER BY name ASC`,
      [zone]
    );
    return result.rows;
  } catch (err) {
    console.error('[Police Station] Error fetching stations by zone:', err.message);
    throw err;
  }
}

/**
 * Create a new police station
 */
async function createStation(name, zone, latitude, longitude, address, phone = null) {
  try {
    const result = await db.query(
      `INSERT INTO police_stations (name, zone, latitude, longitude, address, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, zone, latitude, longitude, address, phone, created_at`,
      [name, zone, latitude, longitude, address, phone]
    );
    console.log(`[Police Station] Created station #${result.rows[0].id}: ${name}`);
    return result.rows[0];
  } catch (err) {
    console.error('[Police Station] Error creating station:', err.message);
    throw err;
  }
}

/**
 * Update police station
 */
async function updateStation(id, updates) {
  try {
    const allowedFields = ['name', 'zone', 'latitude', 'longitude', 'address', 'phone'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return getStationById(id);

    values.push(id);
    const query = `UPDATE police_stations SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Police Station] Error updating station:', err.message);
    throw err;
  }
}

/**
 * Delete police station
 */
async function deleteStation(id) {
  try {
    const result = await db.query(
      `DELETE FROM police_stations WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (!result.rows[0]) throw new Error('Station not found');
    console.log(`[Police Station] Deleted station #${id}`);
    return { success: true, id };
  } catch (err) {
    console.error('[Police Station] Error deleting station:', err.message);
    throw err;
  }
}

/**
 * Get nearby stations
 */
async function getNearbyStations(latitude, longitude, radiusKm = 10) {
  try {
    // Calculate distance using PostgreSQL
    const result = await db.query(
      `SELECT id, name, zone, latitude, longitude, address, phone, created_at,
              (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance_km
       FROM police_stations
       WHERE (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) < $3
       ORDER BY distance_km ASC`,
      [latitude, longitude, radiusKm]
    );
    return result.rows;
  } catch (err) {
    console.error('[Police Station] Error fetching nearby stations:', err.message);
    throw err;
  }
}

module.exports = {
  getAllStations,
  getStationById,
  getStationsByZone,
  createStation,
  updateStation,
  deleteStation,
  getNearbyStations
};
