const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

class LoadTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async runLoadTests() {
    console.log('\n🔥 AMBULANCE ROUTING SYSTEM - LOAD TEST\n');

    try {
      // Test 1: Create multiple ambulances
      await this.testCreateMultipleAmbulances(10);

      // Test 2: Concurrent location updates
      await this.testConcurrentLocationUpdates(5, 20);

      // Test 3: Create incidents rapidly
      await this.testRapidIncidentCreation(15);

      // Test 4: Route calculation performance
      await this.testRouteCalculationPerformance(20);

      // Test 5: Concurrent API calls
      await this.testConcurrentAPICalls(30);

      this.printResults();
    } catch (err) {
      console.error('Load test error:', err.message);
    }
  }

  async testCreateMultipleAmbulances(count) {
    console.log(`Testing creation of ${count} ambulances...`);
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < count; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/ambulances`, {
          driver_name: `Load Test Driver ${i}`,
          latitude: 12.9352 + (Math.random() * 0.05),
          longitude: 77.6245 + (Math.random() * 0.05)
        }).catch(err => ({ error: err.message }))
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    const successful = results.filter(r => !r.error).length;
    this.recordResult('Create Ambulances', count, successful, duration);
  }

  async testConcurrentLocationUpdates(ambulanceId, updateCount) {
    console.log(`Testing ${updateCount} concurrent location updates for ambulance ${ambulanceId}...`);
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < updateCount; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/ambulances/${ambulanceId}/location`, {
          latitude: 12.9352 + (Math.random() * 0.01),
          longitude: 77.6245 + (Math.random() * 0.01)
        }).catch(err => ({ error: err.message }))
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    const successful = results.filter(r => !r.error).length;
    this.recordResult('Location Updates', updateCount, successful, duration);
  }

  async testRapidIncidentCreation(count) {
    console.log(`Testing rapid creation of ${count} incidents...`);
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < count; i++) {
      promises.push(
        axios.post(`${BASE_URL}/api/incidents`, {
          type: ['traffic', 'accident', 'roadblock'][Math.floor(Math.random() * 3)],
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
          latitude: 12.9600 + (Math.random() * 0.1),
          longitude: 77.5800 + (Math.random() * 0.1),
          impact_radius: 200 + Math.random() * 1000,
          description: `Load test incident ${i}`
        }).catch(err => ({ error: err.message }))
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    const successful = results.filter(r => !r.error).length;
    this.recordResult('Create Incidents', count, successful, duration);
  }

  async testRouteCalculationPerformance(count) {
    console.log(`Testing route calculation performance (${count} requests)...`);
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < count; i++) {
      promises.push(
        axios.get(
          `${BASE_URL}/api/routes?from=12.9352,77.6245&to=${12.9700 + Math.random() * 0.05},${77.5900 + Math.random() * 0.05}`
        ).catch(err => ({ error: err.message }))
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    const successful = results.filter(r => !r.error).length;
    this.recordResult('Route Calculations', count, successful, duration);
  }

  async testConcurrentAPICalls(count) {
    console.log(`Testing ${count} concurrent API calls (mixed operations)...`);
    const start = Date.now();
    const promises = [];

    for (let i = 0; i < count; i++) {
      const operation = i % 4;

      let promise;
      switch (operation) {
        case 0:
          promise = axios.get(`${BASE_URL}/api/ambulances`);
          break;
        case 1:
          promise = axios.get(`${BASE_URL}/api/incidents/active`);
          break;
        case 2:
          promise = axios.get(`${BASE_URL}/api/hospitals`);
          break;
        case 3:
          promise = axios.get(`${BASE_URL}/api/police/active`);
          break;
      }

      promises.push(promise.catch(err => ({ error: err.message })));
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - start;

    const successful = results.filter(r => !r.error).length;
    this.recordResult('Concurrent API Calls', count, successful, duration);
  }

  recordResult(testName, total, successful, duration) {
    const successRate = ((successful / total) * 100).toFixed(2);
    const requestsPerSecond = (successful / (duration / 1000)).toFixed(2);

    this.results.push({
      testName,
      total,
      successful,
      failed: total - successful,
      duration,
      successRate,
      requestsPerSecond
    });

    console.log(`  ✓ ${testName}: ${successful}/${total} successful (${successRate}%) in ${duration}ms`);
    console.log(`    Throughput: ${requestsPerSecond} req/s\n`);
  }

  printResults() {
    console.log('\n📊 LOAD TEST RESULTS\n');
    console.log('Test Name                   | Total | Success | Failed | Duration | RPS');
    console.log('─'.repeat(85));

    for (const result of this.results) {
      const name = result.testName.padEnd(27);
      const total = String(result.total).padEnd(7);
      const success = String(result.successful).padEnd(8);
      const failed = String(result.failed).padEnd(7);
      const duration = String(result.duration + 'ms').padEnd(9);
      const rps = result.requestsPerSecond;

      console.log(`${name}| ${total}| ${success}| ${failed}| ${duration}| ${rps}`);
    }

    const avgRPS = (
      this.results.reduce((sum, r) => sum + parseFloat(r.requestsPerSecond), 0) /
      this.results.length
    ).toFixed(2);

    console.log('\n─'.repeat(85));
    console.log(`Average Throughput: ${avgRPS} req/s\n`);
  }
}

async function main() {
  const tester = new LoadTester();
  await tester.runLoadTests();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
