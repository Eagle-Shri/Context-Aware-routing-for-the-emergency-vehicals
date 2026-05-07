/**
 * Database Seeding Script
 * Run: node scripts/seed.js
 * 
 * This script seeds the database with sample hospitals, police stations, and other data
 */

require('dotenv').config();
const db = require('../db/db');

async function seedHospitals() {
  console.log('🏥 Seeding hospitals...');
  
  const hospitals = [
    {
      name: 'Apollo Hospitals Bangalore',
      latitude: 13.0827,
      longitude: 80.2707,
      capacity: 500,
      phone: '080-4060-7777',
      address: '154, Opposite IIM, Bannerghatta Road, Bengaluru 560076'
    },
    {
      name: 'Fortis Hospital Whitefield',
      latitude: 12.9698,
      longitude: 77.7499,
      capacity: 450,
      phone: '080-6618-9999',
      address: 'No.42, Whitefield Road, Bengaluru 560066'
    },
    {
      name: 'Max Super Speciality Hospital',
      latitude: 13.0012,
      longitude: 77.5704,
      capacity: 400,
      phone: '080-3019-3019',
      address: 'B-2175, Hosur Road, Bengaluru 560034'
    },
    {
      name: 'Manipal Hospital Old Airport Road',
      latitude: 12.9732,
      longitude: 77.6245,
      capacity: 480,
      phone: '080-4488-8888',
      address: 'Manipal Hospitals, 98, HAL Old Airport Road, Bengaluru 560017'
    },
    {
      name: 'St. John\'s Medical College Hospital',
      latitude: 12.9716,
      longitude: 77.5946,
      capacity: 350,
      phone: '080-4050-3050',
      address: '27, Sarjapur Road, Bengaluru 560034'
    },
    {
      name: 'Narayana Health City',
      latitude: 12.8615,
      longitude: 77.5697,
      capacity: 550,
      phone: '080-6717-7717',
      address: 'Narayana Hrudayalaya, Hosur Road, Bengaluru 560099'
    },
    {
      name: 'Vikram Hospital Bengaluru',
      latitude: 13.1939,
      longitude: 77.6245,
      capacity: 300,
      phone: '080-4040-4040',
      address: '154/9, Opposite Gitanjali Shopping Center, Yeshwantpur, Bengaluru 560022'
    },
    {
      name: 'Aster CMI Hospital',
      latitude: 12.9716,
      longitude: 77.6245,
      capacity: 420,
      phone: '080-4000-8000',
      address: '43/2, New Airport Road, Bengaluru 560017'
    },
    {
      name: 'Columbia Asia Hospital',
      latitude: 12.9721,
      longitude: 77.7059,
      capacity: 280,
      phone: '080-4606-7777',
      address: '58/A, Kodihalli, Sarjapur Road, Bengaluru 560034'
    },
    {
      name: 'SPARSH Hospital Bengaluru',
      latitude: 12.9808,
      longitude: 77.6408,
      capacity: 250,
      phone: '080-4366-4366',
      address: '154, 2nd Cross Road, Indiranagar, Bengaluru 560038'
    },
    {
      name: 'Sagar Hospitals Jayanagar',
      latitude: 12.9298,
      longitude: 77.5855,
      capacity: 320,
      phone: '080-4288-8888',
      address: '44/54, 30th Cross, Tilaknagar, Jayanagar, Bengaluru 560041'
    },
    {
      name: 'Jayadeva Institute of Cardiovascular Sciences',
      latitude: 12.9248,
      longitude: 77.5936,
      capacity: 600,
      phone: '080-2297-7400',
      address: 'Bannerghatta Main Rd, Jayanagar 9th Block, Bengaluru 560069'
    },
    {
      name: 'Aster RV Hospital JP Nagar',
      latitude: 12.9064,
      longitude: 77.5888,
      capacity: 250,
      phone: '080-6604-0400',
      address: 'CA 37, 24th Main, ITI Layout, JP Nagar 1st Phase, Bengaluru 560078'
    }
  ];

  for (const hospital of hospitals) {
    try {
      const existing = await db.query(
        'SELECT id FROM hospitals WHERE name = $1',
        [hospital.name]
      );
      
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO hospitals (name, latitude, longitude, capacity, available, phone, address)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [hospital.name, hospital.latitude, hospital.longitude, hospital.capacity, hospital.capacity, hospital.phone, hospital.address]
        );
        console.log(`✓ Added hospital: ${hospital.name}`);
      } else {
        console.log(`⊘ Hospital already exists: ${hospital.name}`);
      }
    } catch (err) {
      console.error(`✗ Error adding hospital ${hospital.name}:`, err.message);
    }
  }
}

async function seedAmbulances() {
  console.log('\n🚑 Seeding ambulances...');
  
  const ambulances = [
    { driver_name: 'Mukesh Kumar', latitude: 12.9716, longitude: 77.5946 },
    { driver_name: 'John Abram', latitude: 12.9800, longitude: 77.6400 },
    { driver_name: 'Aman Shaik', latitude: 12.9400, longitude: 77.6200 },
    { driver_name: 'Rajesh Patel', latitude: 13.1939, longitude: 77.6245 },
    { driver_name: 'Vikram Singh', latitude: 12.8615, longitude: 77.5697 }
  ];

  for (const ambulance of ambulances) {
    try {
      const existing = await db.query(
        'SELECT id FROM ambulances WHERE driver_name = $1',
        [ambulance.driver_name]
      );
      
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO ambulances (driver_name, status, latitude, longitude)
           VALUES ($1, $2, $3, $4)`,
          [ambulance.driver_name, 'IDLE', ambulance.latitude, ambulance.longitude]
        );
        console.log(`✓ Added ambulance: ${ambulance.driver_name}`);
      } else {
        console.log(`⊘ Ambulance already exists: ${ambulance.driver_name}`);
      }
    } catch (err) {
      console.error(`✗ Error adding ambulance ${ambulance.driver_name}:`, err.message);
    }
  }
}

async function seedDrivers() {
  console.log('\n👨‍✈️ Seeding drivers...');
  
  const drivers = [
    { name: 'Mukesh Kumar', email: 'mukesh@example.com', phone: '9876543210', license_number: 'DL2024001' },
    { name: 'John Abram', email: 'john@example.com', phone: '9876543211', license_number: 'DL2024002' },
    { name: 'Aman Shaik', email: 'aman@example.com', phone: '9876543212', license_number: 'DL2024003' },
    { name: 'Rajesh Patel', email: 'rajesh@example.com', phone: '9876543213', license_number: 'DL2024004' },
    { name: 'Vikram Singh', email: 'vikram@example.com', phone: '9876543214', license_number: 'DL2024005' }
  ];

  for (const driver of drivers) {
    try {
      const existing = await db.query(
        'SELECT id FROM drivers WHERE email = $1',
        [driver.email]
      );
      
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO drivers (name, email, phone, license_number, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [driver.name, driver.email, driver.phone, driver.license_number, 'IDLE']
        );
        console.log(`✓ Added driver: ${driver.name}`);
      } else {
        console.log(`⊘ Driver already exists: ${driver.name}`);
      }
    } catch (err) {
      console.error(`✗ Error adding driver ${driver.name}:`, err.message);
    }
  }
}

async function seedPoliceStations() {
  console.log('\n🚔 Seeding traffic police stations...');
  await db.query('DELETE FROM police_stations'); // Remove old normal police stations
  
  const stations = [
    { name: 'Cubbon Park Traffic Police Station', zone: 'Central', latitude: 12.9716, longitude: 77.5946, phone: '080-2286-0000', address: 'Cubbon Park, Bengaluru' },
    { name: 'Whitefield Traffic Police Station', zone: 'East', latitude: 12.9698, longitude: 77.7499, phone: '080-4019-1000', address: 'Whitefield, Bengaluru' },
    { name: 'Indiranagar Traffic Police Station', zone: 'East', latitude: 12.9808, longitude: 77.6408, phone: '080-4148-5000', address: 'Indiranagar, Bengaluru' },
    { name: 'Yeshwantpur Traffic Police Station', zone: 'North', latitude: 13.1939, longitude: 77.6245, phone: '080-2340-0000', address: 'Yeshwantpur, Bengaluru' },
    { name: 'Madiwala Traffic Police Station', zone: 'South', latitude: 12.9226, longitude: 77.6174, phone: '080-2294-2576', address: 'Madiwala, Bengaluru' },
    { name: 'Jayanagar Traffic Police Station', zone: 'South', latitude: 12.9298, longitude: 77.5855, phone: '080-2294-2575', address: 'Jayanagar, Bengaluru' },
    { name: 'Koramangala Traffic Police Station', zone: 'South', latitude: 12.9352, longitude: 77.6245, phone: '080-2294-2574', address: 'Koramangala, Bengaluru' },
    { name: 'JP Nagar Traffic Police Station', zone: 'South', latitude: 12.9064, longitude: 77.5888, phone: '080-2294-2573', address: 'JP Nagar, Bengaluru' }
  ];

  for (const station of stations) {
    try {
      const existing = await db.query(
        'SELECT id FROM police_stations WHERE name = $1',
        [station.name]
      );
      
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO police_stations (name, zone, latitude, longitude, address, phone)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [station.name, station.zone, station.latitude, station.longitude, station.address, station.phone]
        );
        console.log(`✓ Added station: ${station.name}`);
      } else {
        console.log(`⊘ Station already exists: ${station.name}`);
      }
    } catch (err) {
      console.error(`✗ Error adding station ${station.name}:`, err.message);
    }
  }
}

async function seedPoliceOfficers() {
  console.log('\n👮 Seeding traffic police officers...');
  
  const officers = [
    { name: 'Traffic Officer Sharma', email: 'sharma@trafficpolice.in', badge_number: 'TP001', zone: 'Central' },
    { name: 'Traffic Officer Singh', email: 'singh@trafficpolice.in', badge_number: 'TP002', zone: 'East' },
    { name: 'Traffic Officer Patel', email: 'patel@trafficpolice.in', badge_number: 'TP003', zone: 'North' },
    { name: 'Traffic Officer Khan', email: 'khan@trafficpolice.in', badge_number: 'TP004', zone: 'South' },
    { name: 'Traffic Officer Desai', email: 'desai@trafficpolice.in', badge_number: 'TP005', zone: 'Central' },
    { name: 'Traffic Officer Reddy', email: 'reddy@trafficpolice.in', badge_number: 'TP006', zone: 'South' }
  ];

  for (const officer of officers) {
    try {
      const existing = await db.query(
        'SELECT id FROM police_officers WHERE badge_number = $1',
        [officer.badge_number]
      );
      
      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO police_officers (name, email, badge_number, zone, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [officer.name, officer.email, officer.badge_number, officer.zone, 'on_duty']
        );
        console.log(`✓ Added officer: ${officer.name} (${officer.badge_number})`);
      } else {
        console.log(`⊘ Officer already exists: ${officer.badge_number}`);
      }
    } catch (err) {
      console.error(`✗ Error adding officer ${officer.name}:`, err.message);
    }
  }
}

async function seed() {
  console.log('📊 Starting database seeding...\n');
  
  try {
    await seedHospitals();
    await seedAmbulances();
    await seedDrivers();
    await seedPoliceStations();
    await seedPoliceOfficers();
    
    console.log('\n✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

seed();
