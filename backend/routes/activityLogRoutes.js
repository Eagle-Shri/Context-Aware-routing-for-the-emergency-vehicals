const express = require('express');
const router = express.Router();
const activityLogService = require('../services/activityLogService');

/**
 * Get all activity logs
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await activityLogService.getAllLogs(limit, offset);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get logs by user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await activityLogService.getLogsByUser(req.params.userId, limit, offset);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get logs by user type
 */
router.get('/type/:userType', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await activityLogService.getLogsByUserType(req.params.userType, limit, offset);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get logs by action
 */
router.get('/action/:action', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await activityLogService.getLogsByAction(req.params.action, limit, offset);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get logs by resource
 */
router.get('/resource/:resourceType/:resourceId', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await activityLogService.getLogsByResource(
      req.params.resourceType,
      req.params.resourceId,
      limit,
      offset
    );
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get activity summary
 */
router.get('/summary', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    
    const summary = await activityLogService.getActivitySummary(startDate, endDate);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete old logs
 */
router.delete('/cleanup/:daysOld', async (req, res) => {
  try {
    const daysOld = Math.min(Math.max(parseInt(req.params.daysOld) || 30, 1), 365);
    const result = await activityLogService.deleteOldLogs(daysOld);
    res.json({ success: true, message: `Deleted ${result.deletedCount} logs older than ${daysOld} days` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
