const express = require('express');
const router = express.Router();
const axios = require('axios');
const routingService = require('../services/routingService');

const OSRM_API_URL = process.env.OSRM_API_URL || 'http://router.project-osrm.org';

/**
 * GET /api/routes?from=lat,lng&to=lat,lng&ambulance_id=id&naive=true
 * Calculate route between two points.
 * naive=true → raw OSRM route with no incident/blockage avoidance (used to show the "original" blocked route alongside the bypass).
 */
router.get('/', async (req, res) => {
  try {
    const { from, to, ambulance_id, naive } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: from, to'
      });
    }

    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);

    if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates format'
      });
    }

    if (naive === 'true') {
      // Return raw OSRM route without any avoidance logic
      const url = `${OSRM_API_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=false`;
      const osrmRes = await axios.get(url, { timeout: 8000 });
      const route = osrmRes.data.routes?.[0];
      if (!route) return res.status(404).json({ success: false, error: 'No naive route found' });
      return res.json({
        success: true,
        data: {
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration,
          rerouted: false,
          naive: true,
        }
      });
    }

    // Get best route (with incident avoidance)
    const route = await routingService.getBestRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
      ambulance_id || null
    );

    res.json({
      success: true,
      data: route
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/routes/check-affected
 * Check if a route is affected by incidents/police updates
 */
router.post('/check-affected', async (req, res) => {
  try {
    const { coordinates, ambulance_id } = req.body;

    if (!coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid coordinates array'
      });
    }

    const affectionCheck = await routingService.isRouteAffected(coordinates, ambulance_id);

    res.json({
      success: true,
      data: affectionCheck
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/routes/clear-cache
 * Clear route cache (manual cache clear)
 */
router.post('/clear-cache', async (req, res) => {
  try {
    const { ambulance_id } = req.body;

    if (ambulance_id) {
      await routingService.clearAmbulanceCache(ambulance_id);
      res.json({
        success: true,
        message: `Cache cleared for ambulance ${ambulance_id}`
      });
    } else {
      await routingService.clearAllCache();
      res.json({
        success: true,
        message: 'All route cache cleared'
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
