const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

class TestSuite {
  constructor() {
    this.socket = null;
    this.testResults = [];
    this.ambulances = [];
    this.hospitals = [];
  }

  async runAllTests() {
    console.log(`\n${colors.blue}🧪 AMBULANCE ROUTING SYSTEM TEST SUITE${colors.reset}\n`);

    try {
      // Test 1: Health check
      await this.testHealthCheck();

      // Test 2: Hospital management
      await this.testHospitalOperations();

      // Test 3: Ambulance management
      await this.testAmbulanceOperations();

      // Test 4: Incident management
      await this.testIncidentOperations();

      // Test 5: Police updates
      await this.testPoliceOperations();

      // Test 6: Routing service
      await this.testRoutingService();

      // Test 7: Real-time Socket.io
      await this.testSocketOperations();

      // Test 8: Smart rerouting
      await this.testSmartRerouting();

      // Print results
      this.printResults();
    } catch (err) {
      console.error(`${colors.red}✗ Test suite error: ${err.message}${colors.reset}`);
    }
  }

  async testHealthCheck() {
    console.log(`${colors.yellow}Testing Health Check...${colors.reset}`);

    try {
      const response = await axios.get(`${BASE_URL}/health`);
      this.assert(response.data.status === 'OK', 'Health check passed');
    } catch (err) {
      this.assert(false, `Health check failed: ${err.message}`);
    }
  }

  async testHospitalOperations() {
    console.log(`\n${colors.yellow}Testing Hospital Operations...${colors.reset}`);

    try {
      // Create hospital
      const createRes = await axios.post(`${BASE_URL}/api/hospitals`, {
        name: 'Test Hospital',
        latitude: 12.9716,
        longitude: 77.5946,
        capacity: 50,
        phone: '+91-11-2341-5500',
        address: 'Test Address'
      });

      this.assert(createRes.status === 201, 'Create hospital');
      this.hospitals.push(createRes.data.data);

      // Get all hospitals
      const allRes = await axios.get(`${BASE_URL}/api/hospitals`);
      this.assert(Array.isArray(allRes.data.data), 'Get all hospitals');

      // Get hospital by ID
      const getRes = await axios.get(`${BASE_URL}/api/hospitals/${createRes.data.data.id}`);
      this.assert(getRes.data.success, 'Get hospital by ID');

      // Update capacity
      const capRes = await axios.post(
        `${BASE_URL}/api/hospitals/${createRes.data.data.id}/capacity`,
        { available: 45 }
      );
      this.assert(capRes.data.data.available === 45, 'Update hospital capacity');

      // Find nearest hospital
      const nearestRes = await axios.get(
        `${BASE_URL}/api/hospitals/nearest?lat=12.9700&lng=77.5900`
      );
      this.assert(nearestRes.data.success, 'Find nearest hospital');
    } catch (err) {
      this.assert(false, `Hospital operations failed: ${err.message}`);
    }
  }

  async testAmbulanceOperations() {
    console.log(`\n${colors.yellow}Testing Ambulance Operations...${colors.reset}`);

    try {
      // Create ambulance
      const createRes = await axios.post(`${BASE_URL}/api/ambulances`, {
        driver_name: 'Test Driver',
        latitude: 12.9352,
        longitude: 77.6245
      });

      this.assert(createRes.status === 201, 'Create ambulance');
      this.ambulances.push(createRes.data.data);

      // Get all ambulances
      const allRes = await axios.get(`${BASE_URL}/api/ambulances`);
      this.assert(Array.isArray(allRes.data.data), 'Get all ambulances');

      // Get ambulance by ID
      const getRes = await axios.get(`${BASE_URL}/api/ambulances/${createRes.data.data.id}`);
      this.assert(getRes.data.success, 'Get ambulance by ID');

      // Update location
      const locRes = await axios.post(
        `${BASE_URL}/api/ambulances/${createRes.data.data.id}/location`,
        { latitude: 12.9360, longitude: 77.6250 }
      );
      this.assert(locRes.data.success, 'Update ambulance location');

      // Update status
      const statusRes = await axios.post(
        `${BASE_URL}/api/ambulances/${createRes.data.data.id}/status`,
        { status: 'BUSY' }
      );
      this.assert(statusRes.data.data.status === 'BUSY', 'Update ambulance status');

      // Get by status
      const statusQueryRes = await axios.get(
        `${BASE_URL}/api/ambulances/status/BUSY`
      );
      this.assert(Array.isArray(statusQueryRes.data.data), 'Get ambulances by status');
    } catch (err) {
      this.assert(false, `Ambulance operations failed: ${err.message}`);
    }
  }

  async testIncidentOperations() {
    console.log(`\n${colors.yellow}Testing Incident Operations...${colors.reset}`);

    try {
      // Create incident
      const createRes = await axios.post(`${BASE_URL}/api/incidents`, {
        type: 'accident',
        severity: 'high',
        latitude: 12.9600,
        longitude: 77.5800,
        impact_radius: 500,
        description: 'Test accident'
      });

      this.assert(createRes.status === 201, 'Create incident');

      // Get all incidents
      const allRes = await axios.get(`${BASE_URL}/api/incidents`);
      this.assert(Array.isArray(allRes.data.data), 'Get all incidents');

      // Get active incidents
      const activeRes = await axios.get(`${BASE_URL}/api/incidents/active`);
      this.assert(Array.isArray(activeRes.data.data), 'Get active incidents');

      // Get by severity
      const sevRes = await axios.get(`${BASE_URL}/api/incidents/severity/high`);
      this.assert(Array.isArray(sevRes.data.data), 'Get incidents by severity');

      // Resolve incident
      const resolveRes = await axios.post(
        `${BASE_URL}/api/incidents/${createRes.data.data.id}/resolve`
      );
      this.assert(resolveRes.data.data.id, 'Resolve incident');
    } catch (err) {
      this.assert(false, `Incident operations failed: ${err.message}`);
    }
  }

  async testPoliceOperations() {
    console.log(`\n${colors.yellow}Testing Police Operations...${colors.reset}`);

    try {
      // Create police update
      const createRes = await axios.post(`${BASE_URL}/api/police/update`, {
        road_name: 'Main Street',
        status: 'blocked',
        severity: 'high',
        latitude: 12.9400,
        longitude: 77.6100,
        impact_radius: 1000,
        description: 'Road blocked for construction'
      });

      this.assert(createRes.status === 201, 'Create police update');

      // Get all updates
      const allRes = await axios.get(`${BASE_URL}/api/police/updates`);
      this.assert(Array.isArray(allRes.data.data), 'Get all police updates');

      // Get active updates
      const activeRes = await axios.get(`${BASE_URL}/api/police/active`);
      this.assert(Array.isArray(activeRes.data.data), 'Get active police updates');

      // Get by road
      const roadRes = await axios.get(`${BASE_URL}/api/police/road/Main%20Street`);
      this.assert(Array.isArray(roadRes.data.data), 'Get updates by road');

      // Clear update
      const clearRes = await axios.post(
        `${BASE_URL}/api/police/${createRes.data.data.id}/clear`
      );
      this.assert(clearRes.data.data.status === 'open', 'Clear police update');
    } catch (err) {
      this.assert(false, `Police operations failed: ${err.message}`);
    }
  }

  async testRoutingService() {
    console.log(`\n${colors.yellow}Testing Routing Service...${colors.reset}`);

    try {
      // Get route between two points
      const routeRes = await axios.get(
        `${BASE_URL}/api/routes?from=12.9352,77.6245&to=12.9716,77.5946`
      );

      this.assert(routeRes.data.success, 'Get route');
      this.assert(routeRes.data.data.distance > 0, 'Route has distance');
      this.assert(routeRes.data.data.duration > 0, 'Route has duration');
      this.assert(Array.isArray(routeRes.data.data.coordinates), 'Route has coordinates');

      // Check if route is affected
      const affectedRes = await axios.post(`${BASE_URL}/api/routes/check-affected`, {
        coordinates: routeRes.data.data.coordinates
      });

      this.assert(affectedRes.data.success, 'Check route affection');
      this.assert(typeof affectedRes.data.data.affected === 'boolean', 'Affection check returns boolean');

      // Clear cache
      const cacheRes = await axios.post(`${BASE_URL}/api/routes/clear-cache`, {});
      this.assert(cacheRes.data.success, 'Clear route cache');
    } catch (err) {
      this.assert(false, `Routing service failed: ${err.message}`);
    }
  }

  async testSocketOperations() {
    console.log(`\n${colors.yellow}Testing Socket.io Operations...${colors.reset}`);

    return new Promise((resolve) => {
      this.socket = io(SOCKET_URL);

      this.socket.on('connect', () => {
        this.assert(true, 'Socket connection established');

        // Subscribe to ambulance updates
        this.socket.emit('subscribe_ambulance', 1);

        this.socket.on('subscription_confirmed', () => {
          this.assert(true, 'Ambulance subscription confirmed');
          this.socket.disconnect();
          resolve();
        });

        setTimeout(() => {
          this.assert(false, 'Socket test timeout');
          this.socket.disconnect();
          resolve();
        }, 3000);
      });

      this.socket.on('error', (err) => {
        this.assert(false, `Socket error: ${err}`);
        resolve();
      });
    });
  }

  async testSmartRerouting() {
    console.log(`\n${colors.yellow}Testing Smart Rerouting...${colors.reset}`);

    try {
      // Create ambulance with destination
      const ambulance = await axios.post(`${BASE_URL}/api/ambulances`, {
        driver_name: 'Rerouting Test Driver',
        latitude: 12.9352,
        longitude: 77.6245
      });

      const ambulanceId = ambulance.data.data.id;

      // Assign destination
      const destRes = await axios.post(
        `${BASE_URL}/api/ambulances/${ambulanceId}/destination`,
        {
          destination: 'Test Hospital',
          latitude: 12.9716,
          longitude: 77.5946
        }
      );

      this.assert(destRes.data.route, 'Initial route calculated');

      // Create incident on route
      const incidentRes = await axios.post(`${BASE_URL}/api/incidents`, {
        type: 'accident',
        severity: 'high',
        latitude: 12.9500,
        longitude: 77.6000,
        impact_radius: 200,
        description: 'Accident on ambulance route'
      });

      this.assert(incidentRes.status === 201, 'Incident created for rerouting test');

      // Verify ambulance status (should trigger rerouting)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedAmb = await axios.get(
        `${BASE_URL}/api/ambulances/${ambulanceId}`
      );

      this.assert(updatedAmb.data.data.status === 'ACTIVE', 'Ambulance remains active during rerouting');
    } catch (err) {
      this.assert(false, `Smart rerouting test failed: ${err.message}`);
    }
  }

  assert(condition, testName) {
    const result = {
      name: testName,
      passed: condition
    };

    this.testResults.push(result);

    const symbol = condition ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  ${symbol} ${testName}`);
  }

  printResults() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`\n${colors.blue}=== TEST RESULTS ===${colors.reset}`);
    console.log(`Passed: ${colors.green}${passed}${colors.reset} / ${total}`);
    console.log(`Success Rate: ${colors.blue}${percentage}%${colors.reset}\n`);

    if (passed === total) {
      console.log(`${colors.green}🎉 All tests passed!${colors.reset}\n`);
    } else {
      console.log(`${colors.red}⚠️  Some tests failed${colors.reset}\n`);
    }
  }
}

// Run tests
async function main() {
  const suite = new TestSuite();
  await suite.runAllTests();
  process.exit(0);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});
