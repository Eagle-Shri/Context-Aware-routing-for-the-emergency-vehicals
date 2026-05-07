const db = require('../db/db');

/**
 * Get all police officers
 */
async function getAllOfficers() {
  try {
    const result = await db.query(
      `SELECT id, name, email, badge_number, zone, status, created_at, updated_at
       FROM police_officers 
       ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (err) {
    console.error('[Police Officer] Error fetching officers:', err.message);
    throw err;
  }
}

/**
 * Get officer by ID
 */
async function getOfficerById(id) {
  try {
    const result = await db.query(
      `SELECT id, name, email, badge_number, zone, status, created_at, updated_at
       FROM police_officers 
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Police Officer] Error fetching officer by ID:', err.message);
    throw err;
  }
}

/**
 * Get officer by badge number
 */
async function getOfficerByBadgeNumber(badgeNumber) {
  try {
    const result = await db.query(
      `SELECT id, name, email, badge_number, zone, status, created_at, updated_at
       FROM police_officers 
       WHERE badge_number = $1`,
      [badgeNumber]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Police Officer] Error fetching officer by badge:', err.message);
    throw err;
  }
}

/**
 * Get officers by zone
 */
async function getOfficersByZone(zone) {
  try {
    const result = await db.query(
      `SELECT id, name, email, badge_number, zone, status, created_at, updated_at
       FROM police_officers 
       WHERE zone = $1
       ORDER BY created_at DESC`,
      [zone]
    );
    return result.rows;
  } catch (err) {
    console.error('[Police Officer] Error fetching officers by zone:', err.message);
    throw err;
  }
}

/**
 * Get officers by status
 */
async function getOfficersByStatus(status) {
  try {
    const result = await db.query(
      `SELECT id, name, email, badge_number, zone, status, created_at, updated_at
       FROM police_officers 
       WHERE status = $1
       ORDER BY created_at DESC`,
      [status]
    );
    return result.rows;
  } catch (err) {
    console.error('[Police Officer] Error fetching officers by status:', err.message);
    throw err;
  }
}

/**
 * Create a new police officer
 */
async function createOfficer(name, email, badgeNumber, zone, passwordHash = null) {
  try {
    const finalPasswordHash = passwordHash || 'default_hashed_password_123';
    const result = await db.query(
      `INSERT INTO police_officers (name, email, badge_number, zone, password_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, badge_number, zone, status, created_at, updated_at`,
      [name, email, badgeNumber, zone, finalPasswordHash, 'on_duty']
    );
    console.log(`[Police Officer] Created officer #${result.rows[0].id}: ${name} (Badge: ${badgeNumber})`);
    return result.rows[0];
  } catch (err) {
    console.error('[Police Officer] Error creating officer:', err.message);
    throw err;
  }
}

/**
 * Update police officer
 */
async function updateOfficer(id, updates) {
  try {
    const allowedFields = ['name', 'email', 'badge_number', 'zone', 'password_hash', 'status'];
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

    if (fields.length === 0) return getOfficerById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE police_officers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    
    return result.rows[0] || null;
  } catch (err) {
    console.error('[Police Officer] Error updating officer:', err.message);
    throw err;
  }
}

/**
 * Update officer status
 */
async function updateOfficerStatus(id, status) {
  try {
    if (!['on_duty', 'off_duty'].includes(status)) {
      throw new Error('Invalid status. Must be on_duty or off_duty');
    }

    const result = await db.query(
      `UPDATE police_officers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    if (!result.rows[0]) throw new Error('Officer not found');
    return result.rows[0];
  } catch (err) {
    console.error('[Police Officer] Error updating officer status:', err.message);
    throw err;
  }
}

/**
 * Delete police officer
 */
async function deleteOfficer(id) {
  try {
    const result = await db.query(
      `DELETE FROM police_officers WHERE id = $1 RETURNING id`,
      [id]
    );
    
    if (!result.rows[0]) throw new Error('Officer not found');
    console.log(`[Police Officer] Deleted officer #${id}`);
    return { success: true, id };
  } catch (err) {
    console.error('[Police Officer] Error deleting officer:', err.message);
    throw err;
  }
}

module.exports = {
  getAllOfficers,
  getOfficerById,
  getOfficerByBadgeNumber,
  getOfficersByZone,
  getOfficersByStatus,
  createOfficer,
  updateOfficer,
  updateOfficerStatus,
  deleteOfficer
};
