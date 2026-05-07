const db = require('../db/db');
const activityLogService = require('./activityLogService');

/**
 * Get all hospitals
 */
async function getAllHospitals() {
  try {
    const result = await db.query(
      `SELECT id, name, latitude, longitude, capacity, available, phone, address, created_at
       FROM hospitals 
       ORDER BY name ASC`
    );
    return result.rows;
  } catch (err) {
    console.error('[Hospital] Error fetching hospitals:', err.message);
    throw err;
  }
}

/**
 * Get hospital by ID
 */
async function getHospitalById(id) {
  try {
    const result = await db.query(
      `SELECT id, name, latitude, longitude, capacity, available, phone, address, created_at
       FROM hospitals 
       WHERE id = $1`,
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    console.error('[Hospital] Error fetching hospital:', err.message);
    throw err;
  }
}

/**
 * Create new hospital
 */
async function createHospital(name, latitude, longitude, capacity, phone = '', address = '') {
  try {
    const result = await db.query(
      `INSERT INTO hospitals (name, latitude, longitude, capacity, available, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, latitude, longitude, capacity, available, phone, address, created_at`,
      [name, latitude, longitude, capacity, capacity, phone, address]
    );

    const hospital = result.rows[0];
    console.log(`[Hospital] Created hospital ${hospital.id}: ${name}`);
    
    // Log activity
    await activityLogService.logActivity(
      null,
      'admin',
      'CREATE',
      'hospital',
      hospital.id,
      { name, latitude, longitude, capacity, phone, address }
    );
    
    return hospital;
  } catch (err) {
    console.error('[Hospital] Error creating hospital:', err.message);
    throw err;
  }
}

/**
 * Update hospital capacity
 */
async function updateHospitalCapacity(id, available) {
  try {
    const hospital = await getHospitalById(id);
    if (!hospital) {
      throw new Error(`Hospital ${id} not found`);
    }

    if (available < 0 || available > hospital.capacity) {
      throw new Error('Invalid available capacity');
    }

    const result = await db.query(
      `UPDATE hospitals 
       SET available = $1
       WHERE id = $2
       RETURNING id, name, capacity, available`,
      [available, id]
    );

    console.log(`[Hospital] Updated capacity for hospital ${id}: ${available}/${hospital.capacity}`);
    
    // Log activity
    await activityLogService.logActivity(
      null,
      'admin',
      'UPDATE_CAPACITY',
      'hospital',
      id,
      { available, capacity: hospital.capacity }
    );
    
    return result.rows[0];
  } catch (err) {
    console.error('[Hospital] Error updating capacity:', err.message);
    throw err;
  }
}

/**
 * Find nearest hospital to coordinates
 */
async function findNearestHospital(lat, lng) {
  try {
    const result = await db.query(
      `SELECT id, name, latitude, longitude, capacity, available, phone,
              SQRT(POWER(latitude - $1, 2) + POWER(longitude - $2, 2)) as distance
       FROM hospitals 
       ORDER BY distance ASC
       LIMIT 1`,
      [lat, lng]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    console.error('[Hospital] Error finding nearest hospital:', err.message);
    throw err;
  }
}

/**
 * Find nearest hospital with available capacity
 */
async function findNearestAvailableHospital(lat, lng) {
  try {
    const result = await db.query(
      `SELECT id, name, latitude, longitude, capacity, available, phone,
              SQRT(POWER(latitude - $1, 2) + POWER(longitude - $2, 2)) as distance
       FROM hospitals 
       WHERE available > 0
       ORDER BY distance ASC
       LIMIT 1`,
      [lat, lng]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    console.error('[Hospital] Error finding available hospital:', err.message);
    throw err;
  }
}

/**
 * Get hospitals by availability
 */
async function getAvailableHospitals() {
  try {
    const result = await db.query(
      `SELECT id, name, latitude, longitude, capacity, available, phone, address
       FROM hospitals 
       WHERE available > 0
       ORDER BY available DESC`
    );
    return result.rows;
  } catch (err) {
    console.error('[Hospital] Error fetching available hospitals:', err.message);
    throw err;
  }
}

/**
 * Delete hospital
 */
async function deleteHospital(id) {
  try {
    const result = await db.query(
      'DELETE FROM hospitals WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Hospital ${id} not found`);
    }

    console.log(`[Hospital] Deleted hospital ${id}`);
    return true;
  } catch (err) {
    console.error('[Hospital] Error deleting hospital:', err.message);
    throw err;
  }
}

module.exports = {
  getAllHospitals,
  getHospitalById,
  createHospital,
  updateHospitalCapacity,
  findNearestHospital,
  findNearestAvailableHospital,
  getAvailableHospitals,
  deleteHospital
};
