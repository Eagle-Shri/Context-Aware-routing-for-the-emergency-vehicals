const express = require('express');
const router = express.Router();
const stationService = require('../services/stationService');
const activityLogService = require('../services/activityLogService');

/**
 * Get all police stations
 */
router.get('/', async (req, res) => {
  try {
    const stations = await stationService.getAllStations();
    res.json({ success: true, count: stations.length, data: stations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get station by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const station = await stationService.getStationById(req.params.id);
    if (!station) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }
    res.json({ success: true, data: station });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get stations by zone
 */
router.get('/zone/:zone', async (req, res) => {
  try {
    const stations = await stationService.getStationsByZone(req.params.zone);
    res.json({ success: true, count: stations.length, data: stations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get nearby stations
 */
router.get('/nearby/:latitude/:longitude', async (req, res) => {
  try {
    const radiusKm = req.query.radius ? parseFloat(req.query.radius) : 10;
    const stations = await stationService.getNearbyStations(
      parseFloat(req.params.latitude),
      parseFloat(req.params.longitude),
      radiusKm
    );
    res.json({ success: true, count: stations.length, data: stations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Create a new police station
 */
router.post('/', async (req, res) => {
  try {
    const { name, zone, latitude, longitude, address, phone } = req.body;
    
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, latitude, longitude'
      });
    }

    const station = await stationService.createStation(
      name,
      zone || null,
      latitude,
      longitude,
      address || null,
      phone || null
    );

    // Log activity
    await activityLogService.logActivity(
      null,
      'admin',
      'CREATE',
      'police_station',
      station.id,
      { name, zone, latitude, longitude },
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('station_created', { station, timestamp: new Date().toISOString() });
    }

    res.status(201).json({ success: true, data: station });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Update police station
 */
router.put('/:id', async (req, res) => {
  try {
    const station = await stationService.updateStation(req.params.id, req.body);
    
    if (!station) {
      return res.status(404).json({ success: false, error: 'Station not found' });
    }

    // Log activity
    await activityLogService.logActivity(
      null,
      'admin',
      'UPDATE',
      'police_station',
      req.params.id,
      req.body,
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('station_updated', { station, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, data: station });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete police station
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await stationService.deleteStation(req.params.id);

    // Log activity
    await activityLogService.logActivity(
      null,
      'admin',
      'DELETE',
      'police_station',
      req.params.id,
      {},
      req.ip,
      req.get('user-agent')
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('station_deleted', { stationId: req.params.id, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, message: 'Station deleted', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
