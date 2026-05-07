const express = require('express');
const router = express.Router();
const policeService = require('../services/policeService');

/**
 * GET /api/police/updates
 * Get all police updates
 */
router.get('/updates', async (req, res) => {
  try {
    const updates = await policeService.getAllPoliceUpdates();
    res.json({
      success: true,
      count: updates.length,
      data: updates
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/police/active
 * Get active police updates (blocked roads)
 */
router.get('/active', async (req, res) => {
  try {
    const updates = await policeService.getActivePoliceUpdates();
    res.json({
      success: true,
      count: updates.length,
      data: updates
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/police/road/:roadName
 * Get police updates for specific road
 */
router.get('/road/:roadName', async (req, res) => {
  try {
    const updates = await policeService.getPoliceUpdatesByRoad(req.params.roadName);
    res.json({
      success: true,
      count: updates.length,
      data: updates
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/police/update
 * Create or update police status
 */
router.post('/update', async (req, res) => {
  try {
    const {
      road_name,
      status,
      severity,
      latitude,
      longitude,
      impact_radius,
      expected_clearance,
      description
    } = req.body;

    if (
      !road_name ||
      !status ||
      !severity ||
      latitude === undefined ||
      longitude === undefined ||
      !impact_radius
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: road_name, status, severity, latitude, longitude, impact_radius'
      });
    }

    const update = await policeService.updatePoliceStatus(
      road_name,
      status.toLowerCase(),
      severity.toLowerCase(),
      latitude,
      longitude,
      impact_radius,
      expected_clearance || null,
      description || '',
      req.io
    );

    res.status(201).json({
      success: true,
      data: update
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/police/:id/clear
 * Clear police update (road opened)
 */
router.post('/:id/clear', async (req, res) => {
  try {
    const update = await policeService.clearPoliceUpdate(req.params.id, req.io);
    res.json({
      success: true,
      data: update
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/police/:id
 * Delete police update
 */
router.delete('/:id', async (req, res) => {
  try {
    await policeService.deletePoliceUpdate(req.params.id);
    res.json({
      success: true,
      message: 'Police update deleted'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
