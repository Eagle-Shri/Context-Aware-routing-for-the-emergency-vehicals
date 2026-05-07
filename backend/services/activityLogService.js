const db = require('../db/db');

/**
 * Log an activity
 */
async function logActivity(userId, userType, action, resourceType = null, resourceId = null, details = null, ipAddress = null, userAgent = null, status = 'success') {
  try {
    const result = await db.query(
      `INSERT INTO activity_logs (user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status, timestamp, created_at`,
      [userId, userType, action, resourceType, resourceId, details ? JSON.stringify(details) : null, ipAddress, userAgent, status]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[Activity Log] Error logging activity:', err.message);
    // Don't throw - logging errors shouldn't break the main operation
    return null;
  }
}

/**
 * Get all activity logs
 */
async function getAllLogs(limit = 100, offset = 0) {
  try {
    const result = await db.query(
      `SELECT id, user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status, timestamp, created_at
       FROM activity_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('[Activity Log] Error fetching logs:', err.message);
    throw err;
  }
}

/**
 * Get logs by user
 */
async function getLogsByUser(userId, limit = 100, offset = 0) {
  try {
    const result = await db.query(
      `SELECT id, user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status, timestamp, created_at
       FROM activity_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('[Activity Log] Error fetching logs by user:', err.message);
    throw err;
  }
}

/**
 * Get logs by user type
 */
async function getLogsByUserType(userType, limit = 100, offset = 0) {
  try {
    const result = await db.query(
      `SELECT id, user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status, timestamp, created_at
       FROM activity_logs
       WHERE user_type = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userType, limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('[Activity Log] Error fetching logs by user type:', err.message);
    throw err;
  }
}

/**
 * Get logs by resource
 */
async function getLogsByResource(resourceType, resourceId, limit = 100, offset = 0) {
  try {
    const result = await db.query(
      `SELECT id, user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status, timestamp, created_at
       FROM activity_logs
       WHERE resource_type = $1 AND resource_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [resourceType, resourceId, limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('[Activity Log] Error fetching logs by resource:', err.message);
    throw err;
  }
}

/**
 * Get logs by action
 */
async function getLogsByAction(action, limit = 100, offset = 0) {
  try {
    const result = await db.query(
      `SELECT id, user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status, timestamp, created_at
       FROM activity_logs
       WHERE action = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [action, limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('[Activity Log] Error fetching logs by action:', err.message);
    throw err;
  }
}

/**
 * Get logs by date range
 */
async function getLogsByDateRange(startDate, endDate, limit = 100, offset = 0) {
  try {
    const result = await db.query(
      `SELECT id, user_id, user_type, action, resource_type, resource_id, details, ip_address, user_agent, status, timestamp, created_at
       FROM activity_logs
       WHERE created_at BETWEEN $1 AND $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [startDate, endDate, limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('[Activity Log] Error fetching logs by date range:', err.message);
    throw err;
  }
}

/**
 * Get activity summary (count by action)
 */
async function getActivitySummary(startDate = null, endDate = null) {
  try {
    let query = `SELECT action, COUNT(*) as count FROM activity_logs`;
    const params = [];

    if (startDate && endDate) {
      query += ` WHERE created_at BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY action ORDER BY count DESC`;

    const result = await db.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('[Activity Log] Error fetching activity summary:', err.message);
    throw err;
  }
}

/**
 * Delete old logs (cleanup)
 */
async function deleteOldLogs(daysOld = 30) {
  try {
    const result = await db.query(
      `DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '${daysOld} days' RETURNING id`,
    );
    console.log(`[Activity Log] Deleted ${result.rowCount} old logs`);
    return { deletedCount: result.rowCount };
  } catch (err) {
    console.error('[Activity Log] Error deleting old logs:', err.message);
    throw err;
  }
}

module.exports = {
  logActivity,
  getAllLogs,
  getLogsByUser,
  getLogsByUserType,
  getLogsByResource,
  getLogsByAction,
  getLogsByDateRange,
  getActivitySummary,
  deleteOldLogs
};
