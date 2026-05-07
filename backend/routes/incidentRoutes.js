const express = require('express');
const router = express.Router();
const incidentService = require('../services/incidentService');

/**
 * GET /api/incidents
 * Get all incidents
 */
router.get('/', async (req, res) => {
  try {
    const incidents = await incidentService.getAllIncidents();
    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/incidents/active
 * Get active incidents
 */
router.get('/active', async (req, res) => {
  try {
    const incidents = await incidentService.getActiveIncidents();
    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/incidents/:id
 * Get incident by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }
    res.json({
      success: true,
      data: incident
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/incidents/severity/:severity
 * Get incidents by severity
 */
router.get('/severity/:severity', async (req, res) => {
  try {
    const incidents = await incidentService.getIncidentsBySeverity(req.params.severity.toLowerCase());
    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/incidents
 * Create new incident
 */
router.post('/', async (req, res) => {
  try {
    const { type, severity, latitude, longitude, impact_radius, description } = req.body;

    if (
      !type ||
      !severity ||
      latitude === undefined ||
      longitude === undefined ||
      !impact_radius
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, severity, latitude, longitude, impact_radius'
      });
    }

    const incident = await incidentService.createIncident(
      type.toLowerCase(),
      severity.toLowerCase(),
      latitude,
      longitude,
      impact_radius,
      description || '',
      req.io
    );

    res.status(201).json({
      success: true,
      data: incident
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/incidents/:id/resolve
 * Resolve incident
 */
router.post('/:id/resolve', async (req, res) => {
  try {
    const incident = await incidentService.resolveIncident(req.params.id, req.io);
    res.json({
      success: true,
      data: incident
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * DELETE /api/incidents/:id
 * Delete incident
 */
router.delete('/:id', async (req, res) => {
  try {
    await incidentService.deleteIncident(req.params.id, req.io);
    res.json({
      success: true,
      message: 'Incident deleted'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
