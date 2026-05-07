const db = require('./db/db');
const ambulanceService = require('./services/ambulanceService');

/**
 * Simulate ambulance movement along a route
 * Moves the ambulance incrementally towards destination
 */
async function simulateAmbulanceMovement(ambulanceId, io) {
  try {
    const ambulance = await ambulanceService.getAmbulanceById(ambulanceId);

    if (!ambulance || ambulance.status !== 'ACTIVE' || !ambulance.destination_lat) {
      return;
    }

    const currentLat = ambulance.latitude;
    const currentLng = ambulance.longitude;
    const destLat = ambulance.destination_lat;
    const destLng = ambulance.destination_lng;

    // Calculate movement vector
    const latDiff = destLat - currentLat;
    const lngDiff = destLng - currentLng;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // If very close to destination (within 0.0001 degrees ~ 11 meters), mark as arrived
    if (distance < 0.0001) {
      console.log(`[Simulation] Ambulance ${ambulanceId} arrived at destination`);
      await ambulanceService.clearDestination(ambulanceId);

      if (io) {
        io.emit('ambulance_arrived', {
          ambulance_id: ambulanceId,
          destination: ambulance.destination,
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // Move 1/100th of remaining distance per update (smooth movement)
    const newLat = currentLat + (latDiff / 100);
    const newLng = currentLng + (lngDiff / 100);

    // Update location
    await ambulanceService.updateAmbulanceLocation(ambulanceId, newLat, newLng, io);

  } catch (err) {
    console.error(`[Simulation] Error simulating ambulance ${ambulanceId}:`, err.message);
  }
}

/**
 * Start GPS simulation for all active ambulances
 */
function startGPSSimulation(io) {
  console.log('[Simulation] Starting GPS simulation (updates every 2 seconds)');

  setInterval(async () => {
    try {
      // Get all active ambulances
      const ambulances = await ambulanceService.getAmbulancesByStatus('ACTIVE');

      for (const ambulance of ambulances) {
        await simulateAmbulanceMovement(ambulance.id, io);
      }
    } catch (err) {
      console.error('[Simulation] Error in GPS simulation loop:', err.message);
    }
  }, 2000); // Update every 2 seconds
}

/**
 * Create test data: ambulances, hospitals, and initial incidents
 */
async function createTestData(io) {
  try {
    console.log('\n[Setup] Creating test data...');

    // Create hospitals
    console.log('[Setup] Creating hospitals...');
    const hospitals = [
      {
        name: 'City General Hospital',
        latitude: 12.9716,
        longitude: 77.5946,
        capacity: 50,
        phone: '+91-11-2341-5500',
        address: 'Fort Road, New Delhi'
      },
      {
        name: 'Metro Medical Center',
        latitude: 12.9520,
        longitude: 77.6245,
        capacity: 75,
        phone: '+91-11-2651-2002',
        address: 'Khan Market, New Delhi'
      },
      {
        name: 'Apollo Hospital',
        latitude: 13.0827,
        longitude: 77.5933,
        capacity: 100,
        phone: '+91-11-4179-9999',
        address: 'Sarita Vihar, New Delhi'
      }
    ];

    const hospitalService = require('./services/hospitalService');
    for (const hospital of hospitals) {
      try {
        await hospitalService.createHospital(
          hospital.name,
          hospital.latitude,
          hospital.longitude,
          hospital.capacity,
          hospital.phone,
          hospital.address
        );
      } catch (err) {
        // Hospital might already exist
      }
    }

    // Create ambulances
    console.log('[Setup] Creating ambulances...');
    const ambulances = [
      { driver_name: 'Driver 1', latitude: 12.9352, longitude: 77.6245 },
      { driver_name: 'Driver 2', latitude: 12.9400, longitude: 77.6100 },
      { driver_name: 'Driver 3', latitude: 12.9600, longitude: 77.5800 }
    ];

    for (const amb of ambulances) {
      try {
        const ambulance = await ambulanceService.createAmbulance(
          amb.driver_name,
          amb.latitude,
          amb.longitude
        );
        console.log(`  ✓ Created ambulance ${ambulance.id}: ${amb.driver_name}`);
      } catch (err) {
        // Ambulance might already exist
      }
    }

    console.log('[Setup] Test data created successfully\n');
  } catch (err) {
    console.error('[Setup] Error creating test data:', err.message);
  }
}

/**
 * Log system statistics
 */
async function logSystemStats() {
  try {
    const ambulances = await ambulanceService.getAllAmbulances();
    const activeResult = await db.query(
      'SELECT COUNT(*) as count FROM incidents WHERE resolved = false'
    );
    const policeResult = await db.query(
      "SELECT COUNT(*) as count FROM police_updates WHERE status = 'blocked'"
    );

    const active = ambulances.filter(a => a.status === 'ACTIVE').length;
    const idle = ambulances.filter(a => a.status === 'IDLE').length;
    const busy = ambulances.filter(a => a.status === 'BUSY').length;

    console.log('\n=== SYSTEM STATISTICS ===');
    console.log(`Ambulances: ${ambulances.length} total (${active} ACTIVE, ${idle} IDLE, ${busy} BUSY)`);
    console.log(`Active Incidents: ${activeResult.rows[0].count}`);
    console.log(`Blocked Roads: ${policeResult.rows[0].count}`);
    console.log('========================\n');
  } catch (err) {
    console.error('[Stats] Error logging stats:', err.message);
  }
}

module.exports = {
  simulateAmbulanceMovement,
  startGPSSimulation,
  createTestData,
  logSystemStats
};
