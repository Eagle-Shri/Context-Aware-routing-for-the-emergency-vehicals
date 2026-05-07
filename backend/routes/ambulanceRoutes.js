const express = require('express');
const router = express.Router();
const ambulanceService = require('../services/ambulanceService');
const routingService = require('../services/routingService');
const db = require('../db/db');

router.get('/', async (req, res) => {
  try {
    const ambulances = await ambulanceService.getAllAmbulances();
    res.json({ success: true, count: ambulances.length, data: ambulances });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/status/:status', async (req, res) => {
  try {
    const ambulances = await ambulanceService.getAmbulancesByStatus(req.params.status.toUpperCase());
    res.json({ success: true, count: ambulances.length, data: ambulances });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ambulance = await ambulanceService.getAmbulanceById(req.params.id);
    if (!ambulance) return res.status(404).json({ success: false, error: 'Ambulance not found' });
    res.json({ success: true, data: ambulance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { driver_name, latitude, longitude } = req.body;
    if (!driver_name || latitude === undefined || longitude === undefined)
      return res.status(400).json({ success: false, error: 'Missing required fields: driver_name, latitude, longitude' });
    const ambulance = await ambulanceService.createAmbulance(driver_name, latitude, longitude);
    res.status(201).json({ success: true, data: ambulance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined)
      return res.status(400).json({ success: false, error: 'Missing required fields: latitude, longitude' });
    const ambulance = await ambulanceService.updateAmbulanceLocation(req.params.id, latitude, longitude, req.io);
    res.json({ success: true, data: ambulance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Missing required field: status' });
    const ambulance = await ambulanceService.updateAmbulanceStatus(req.params.id, status);
    if (req.io) req.io.emit('ambulance_status_changed', { ambulance_id: req.params.id, status, timestamp: new Date().toISOString() });
    res.json({ success: true, data: ambulance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ambulances/:id/dispatch
 * Full dispatch: assign source + destination, calculate route avoiding blocked areas,
 * set status ACTIVE, save to DB, emit socket events.
 */
router.post('/:id/dispatch', async (req, res) => {
  try {
    const { destination, dest_lat, dest_lng, source_name, src_lat, src_lng } = req.body;
    if (!destination || dest_lat === undefined || dest_lng === undefined)
      return res.status(400).json({ success: false, error: 'Missing: destination, dest_lat, dest_lng' });

    const ambulanceId = req.params.id;

    // Get current ambulance location (use src_lat/lng if provided, else use DB location)
    const current = await ambulanceService.getAmbulanceById(ambulanceId);
    if (!current) return res.status(404).json({ success: false, error: 'Ambulance not found' });

    const fromLat = parseFloat(src_lat) || parseFloat(current.latitude);
    const fromLng = parseFloat(src_lng) || parseFloat(current.longitude);

    // Clear stale cache so we get a fresh avoid-zone route
    await routingService.clearAmbulanceCache(ambulanceId);

    // Calculate best route (with blocked-area avoidance)
    const route = await routingService.getBestRoute(
      { lat: fromLat, lng: fromLng },
      { lat: parseFloat(dest_lat), lng: parseFloat(dest_lng) },
      ambulanceId
    );

    // Persist source + destination + route + status=ACTIVE
    const ambulance = await ambulanceService.assignDestination(
      ambulanceId, destination,
      parseFloat(dest_lat), parseFloat(dest_lng),
      source_name || null, fromLat, fromLng
    );

    await db.query('UPDATE ambulances SET current_route=$1 WHERE id=$2', [JSON.stringify(route), ambulanceId]);

    // Broadcast via socket
    if (req.io) {
      req.io.emit('route_updated', {
        ambulance_id: ambulanceId,
        route,
        trigger: 'dispatch',
        rerouted: route.rerouted || false,
        avoided_count: route.avoided_count || 0,
        timestamp: new Date().toISOString()
      });
      req.io.emit('ambulance_status_changed', {
        ambulance_id: ambulanceId,
        status: 'ACTIVE',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: { ambulance, route }
    });
  } catch (err) {
    console.error('[Dispatch] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/destination', async (req, res) => {
  try {
    const { destination, latitude, longitude } = req.body;
    if (!destination || latitude === undefined || longitude === undefined)
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    const ambulance = await ambulanceService.assignDestination(req.params.id, destination, latitude, longitude);
    const current = await ambulanceService.getAmbulanceById(req.params.id);
    const route = await routingService.getBestRoute(
      { lat: current.latitude, lng: current.longitude },
      { lat: latitude, lng: longitude },
      req.params.id
    );
    await db.query('UPDATE ambulances SET current_route=$1 WHERE id=$2', [JSON.stringify(route), req.params.id]);
    if (req.io) req.io.emit('route_updated', { ambulance_id: req.params.id, route, timestamp: new Date().toISOString() });
    res.json({ success: true, data: { ambulance, route } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/clear-destination', async (req, res) => {
  try {
    const ambulance = await ambulanceService.clearDestination(req.params.id);
    if (req.io) req.io.emit('ambulance_status_changed', { ambulance_id: req.params.id, status: 'IDLE', timestamp: new Date().toISOString() });
    res.json({ success: true, data: ambulance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ambulanceService.deleteAmbulance(req.params.id);
    res.json({ success: true, message: 'Ambulance deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
