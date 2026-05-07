const db = require('../db/db');

/**
 * Get all drivers
 */
async function getAllDrivers() {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, ambulance_id, status, license_number, created_at, updated_at
       FROM drivers 
       ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (err) {
    console.error('[Driver] Error fetching drivers:', err.message);
    throw err;
  }
}

/**
 * Get driver by ID
 */
async function getDriverById(id) {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, ambulance_id, status, license_number, created_at, updated_at
       FROM drivers 
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Driver] Error fetching driver by ID:', err.message);
    throw err;
  }
}

/**
 * Get driver by ambulance ID
 */
async function getDriverByAmbulanceId(ambulanceId) {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, ambulance_id, status, license_number, created_at, updated_at
       FROM drivers 
       WHERE ambulance_id = $1`,
      [ambulanceId]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Driver] Error fetching driver by ambulance ID:', err.message);
    throw err;
  }
}

/**
 * Create a new driver
 */
async function createDriver(name, email, phone, licenseNumber, ambulanceId = null) {
  try {
    const finalPasswordHash = 'default_hashed_password_123';
    const result = await db.query(
      `INSERT INTO drivers (name, email, phone, license_number, ambulance_id, status, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, phone, ambulance_id, status, license_number, created_at, updated_at`,
      [name, email, phone, licenseNumber, ambulanceId, 'IDLE', finalPasswordHash]
    );
    console.log(`[Driver] Created driver #${result.rows[0].id}: ${name}`);
    return result.rows[0];
  } catch (err) {
    console.error('[Driver] Error creating driver:', err.message);
    throw err;
  }
}

/**
 * Update driver
 */
async function updateDriver(id, updates) {
  try {
    const allowedFields = ['name', 'email', 'phone', 'license_number', 'ambulance_id', 'status'];
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

    if (fields.length === 0) return getDriverById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE drivers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Driver] Error updating driver:', err.message);
    throw err;
  }
}

/**
 * Update driver status
 */
async function updateDriverStatus(id, status) {
  try {
    if (!['IDLE', 'ACTIVE', 'BUSY'].includes(status)) {
      throw new Error('Invalid status. Must be IDLE, ACTIVE, or BUSY');
    }

    const result = await db.query(
      `UPDATE drivers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    if (!result.rows[0]) throw new Error('Driver not found');
    return result.rows[0];
  } catch (err) {
    console.error('[Driver] Error updating driver status:', err.message);
    throw err;
  }
}

/**
 * Assign driver to ambulance
 */
async function assignDriverToAmbulance(driverId, ambulanceId) {
  try {
    const result = await db.query(
      `UPDATE drivers SET ambulance_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [ambulanceId, driverId]
    );
    
    if (!result.rows[0]) throw new Error('Driver not found');
    console.log(`[Driver] Assigned driver #${driverId} to ambulance #${ambulanceId}`);
    return result.rows[0];
  } catch (err) {
    console.error('[Driver] Error assigning driver:', err.message);
    throw err;
  }
}

/**
 * Delete driver
 */
async function deleteDriver(id) {
  try {
    const result = await db.query(
      `DELETE FROM drivers WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (!result.rows[0]) throw new Error('Driver not found');
    console.log(`[Driver] Deleted driver #${id}`);
    return { success: true, id };
  } catch (err) {
    console.error('[Driver] Error deleting driver:', err.message);
    throw err;
  }
}

/**
 * Get drivers by status
 */
async function getDriversByStatus(status) {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, ambulance_id, status, license_number, created_at, updated_at
       FROM drivers 
       WHERE status = $1
       ORDER BY created_at DESC`,
      [status]
    );
    return result.rows;
  } catch (err) {
    console.error('[Driver] Error fetching drivers by status:', err.message);
    throw err;
  }
}

module.exports = {
  getAllDrivers,
  getDriverById,
  getDriverByAmbulanceId,
  createDriver,
  updateDriver,
  updateDriverStatus,
  assignDriverToAmbulance,
  deleteDriver,
  getDriversByStatus
};
