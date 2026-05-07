const express = require('express');
const router = express.Router();
const hospitalService = require('../services/hospitalService');

/**
 * GET /api/hospitals
 * Get all hospitals
 */
router.get('/', async (req, res) => {
  try {
    const hospitals = await hospitalService.getAllHospitals();
    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/hospitals/available
 * Get hospitals with available capacity
 */
router.get('/available', async (req, res) => {
  try {
    const hospitals = await hospitalService.getAvailableHospitals();
    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


/**
 * GET /api/hospitals/nearest?lat=xxx&lng=xxx
 * Find nearest hospital
 */
router.get('/nearest', async (req, res) => {
  try {
    const { lat, lng, available } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing query parameters: lat, lng'
      });
    }

    let hospital;
    if (available === 'true') {
      hospital = await hospitalService.findNearestAvailableHospital(parseFloat(lat), parseFloat(lng));
    } else {
      hospital = await hospitalService.findNearestHospital(parseFloat(lat), parseFloat(lng));
    }

    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: 'No hospital found'
      });
    }

    res.json({
      success: true,
      data: hospital
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


/**
 * GET /api/hospitals/:id
 * Get hospital by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: 'Hospital not found'
      });
    }
    res.json({
      success: true,
      data: hospital
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/hospitals
 * Create new hospital
 */
router.post('/', async (req, res) => {
  try {
    const { name, latitude, longitude, capacity, phone, address } = req.body;

    if (!name || latitude === undefined || longitude === undefined || !capacity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, latitude, longitude, capacity'
      });
    }

    const hospital = await hospitalService.createHospital(
      name,
      latitude,
      longitude,
      capacity,
      phone || '',
      address || ''
    );

    res.status(201).json({
      success: true,
      data: hospital
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/hospitals/:id/capacity
 * Update hospital available capacity
 */
router.post('/:id/capacity', async (req, res) => {
  try {
    const { available } = req.body;

    if (available === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: available'
      });
    }

    const hospital = await hospitalService.updateHospitalCapacity(req.params.id, available);
    res.json({
      success: true,
      data: hospital
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/hospitals/:id
 * Delete hospital
 */
router.delete('/:id', async (req, res) => {
  try {
    await hospitalService.deleteHospital(req.params.id);
    res.json({
      success: true,
      message: 'Hospital deleted'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
