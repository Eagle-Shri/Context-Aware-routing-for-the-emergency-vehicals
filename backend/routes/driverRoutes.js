const express = require('express');
const router = express.Router();
const driverService = require('../services/driverService');
const activityLogService = require('../services/activityLogService');

/**
 * Get all drivers
 */
router.get('/', async (req, res) => {
  try {
    const drivers = await driverService.getAllDrivers();
    res.json({ success: true, count: drivers.length, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get driver by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get driver by status
 */
router.get('/status/:status', async (req, res) => {
  try {
    const drivers = await driverService.getDriversByStatus(req.params.status.toUpperCase());
    res.json({ success: true, count: drivers.length, data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Create a new driver
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, license_number, ambulance_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const driver = await driverService.createDriver(
      name,
      email || null,
      phone || null,
      license_number || null,
      ambulance_id || null
    );

    // Log activity
    await activityLogService.logActivity(
      driver.id,
      'driver',
      'CREATE',
      'driver',
      driver.id,
      { name, email },
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('driver_created', { driver, timestamp: new Date().toISOString() });
    }

    res.status(201).json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Update driver
 */
router.put('/:id', async (req, res) => {
  try {
    const driver = await driverService.updateDriver(req.params.id, req.body);
    
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    // Log activity
    await activityLogService.logActivity(
      req.params.id,
      'driver',
      'UPDATE',
      'driver',
      req.params.id,
      req.body,
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('driver_updated', { driver, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update driver status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required' });
    }

    const driver = await driverService.updateDriverStatus(req.params.id, status);

    // Log activity
    await activityLogService.logActivity(
      req.params.id,
      'driver',
      'UPDATE_STATUS',
      'driver',
      req.params.id,
      { status },
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('driver_status_changed', { driver, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Assign driver to ambulance
 */
router.patch('/:id/assign', async (req, res) => {
  try {
    const { ambulance_id } = req.body;
    
    if (!ambulance_id) {
      return res.status(400).json({ success: false, error: 'ambulance_id is required' });
    }

    const driver = await driverService.assignDriverToAmbulance(req.params.id, ambulance_id);

    // Log activity
    await activityLogService.logActivity(
      req.params.id,
      'driver',
      'ASSIGN_AMBULANCE',
      'driver',
      req.params.id,
      { ambulance_id },
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('driver_assigned', { driver, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete driver
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await driverService.deleteDriver(req.params.id);

    // Log activity
    await activityLogService.logActivity(
      req.params.id,
      'driver',
      'DELETE',
      'driver',
      req.params.id,
      {},
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('driver_deleted', { driverId: req.params.id, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, message: 'Driver deleted', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
