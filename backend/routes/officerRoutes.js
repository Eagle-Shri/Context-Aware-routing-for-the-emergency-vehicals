const express = require('express');
const router = express.Router();
const policeOfficerService = require('../services/policeOfficerService');
const activityLogService = require('../services/activityLogService');

/**
 * Get all police officers
 */
router.get('/', async (req, res) => {
  try {
    const officers = await policeOfficerService.getAllOfficers();
    res.json({ success: true, count: officers.length, data: officers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get officer by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const officer = await policeOfficerService.getOfficerById(req.params.id);
    if (!officer) {
      return res.status(404).json({ success: false, error: 'Officer not found' });
    }
    res.json({ success: true, data: officer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get officers by zone
 */
router.get('/zone/:zone', async (req, res) => {
  try {
    const officers = await policeOfficerService.getOfficersByZone(req.params.zone);
    res.json({ success: true, count: officers.length, data: officers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get officers by status
 */
router.get('/status/:status', async (req, res) => {
  try {
    const officers = await policeOfficerService.getOfficersByStatus(req.params.status);
    res.json({ success: true, count: officers.length, data: officers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Create a new police officer
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, badge_number, zone, password_hash } = req.body;
    
    if (!name || !badge_number) {
      return res.status(400).json({ success: false, error: 'name and badge_number are required' });
    }

    const officer = await policeOfficerService.createOfficer(
      name,
      email || null,
      badge_number,
      zone || null,
      password_hash || null
    );

    // Log activity
    await activityLogService.logActivity(
      officer.id,
      'police_officer',
      'CREATE',
      'police_officer',
      officer.id,
      { name, email, badge_number, zone },
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('officer_created', { officer, timestamp: new Date().toISOString() });
    }

    res.status(201).json({ success: true, data: officer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Update police officer
 */
router.put('/:id', async (req, res) => {
  try {
    const officer = await policeOfficerService.updateOfficer(req.params.id, req.body);
    
    if (!officer) {
      return res.status(404).json({ success: false, error: 'Officer not found' });
    }

    // Log activity
    await activityLogService.logActivity(
      req.params.id,
      'police_officer',
      'UPDATE',
      'police_officer',
      req.params.id,
      req.body,
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('officer_updated', { officer, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, data: officer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update officer status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['on_duty', 'off_duty'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be on_duty or off_duty' });
    }

    const officer = await policeOfficerService.updateOfficerStatus(req.params.id, status);

    // Log activity
    await activityLogService.logActivity(
      req.params.id,
      'police_officer',
      'UPDATE_STATUS',
      'police_officer',
      req.params.id,
      { status },
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('officer_status_changed', { officer, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, data: officer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete police officer
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await policeOfficerService.deleteOfficer(req.params.id);

    // Log activity
    await activityLogService.logActivity(
      req.params.id,
      'police_officer',
      'DELETE',
      'police_officer',
      req.params.id,
      {},
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('officer_deleted', { officerId: req.params.id, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, message: 'Officer deleted', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
