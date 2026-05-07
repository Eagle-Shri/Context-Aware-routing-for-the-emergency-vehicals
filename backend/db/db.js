const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host:     process.env.PGHOST     || process.env.DB_HOST     || 'localhost',
      port:     process.env.PGPORT     || process.env.DB_PORT     || 5432,
      user:     process.env.PGUSER     || process.env.DB_USER     || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'password',
      database: process.env.PGDATABASE || process.env.DB_NAME     || 'ambulance_system',
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function initDatabase() {
  try {
    console.log('Initializing database tables...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ambulances (
        id SERIAL PRIMARY KEY,
        driver_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'ACTIVE', 'BUSY')),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        destination VARCHAR(255),
        destination_lat DECIMAL(10, 8),
        destination_lng DECIMAL(11, 8),
        source_name VARCHAR(255),
        source_lat DECIMAL(10, 8),
        source_lng DECIMAL(11, 8),
        current_route JSONB,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add source columns if missing (for existing deployments)
    await pool.query(`ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS source_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS source_lat DECIMAL(10, 8)`);
    await pool.query(`ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS source_lng DECIMAL(11, 8)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        impact_radius DECIMAL(10, 4) NOT NULL,
        description TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        capacity INT NOT NULL,
        available INT NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS police_updates (
        id SERIAL PRIMARY KEY,
        road_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'blocked')),
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        impact_radius DECIMAL(10, 4),
        expected_clearance TIMESTAMP,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_cache (
        id SERIAL PRIMARY KEY,
        ambulance_id INT REFERENCES ambulances(id) ON DELETE CASCADE,
        source_lat DECIMAL(10, 8) NOT NULL,
        source_lng DECIMAL(11, 8) NOT NULL,
        dest_lat DECIMAL(10, 8) NOT NULL,
        dest_lng DECIMAL(11, 8) NOT NULL,
        route_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ambulance_id, source_lat, source_lng, dest_lat, dest_lng)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS police_stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        zone VARCHAR(100),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS police_officers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        badge_number VARCHAR(50) NOT NULL UNIQUE,
        zone VARCHAR(100),
        password_hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'on_duty' CHECK (status IN ('on_duty', 'off_duty')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        ambulance_id INT REFERENCES ambulances(id) ON DELETE SET NULL,
        password_hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'ACTIVE', 'BUSY')),
        license_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        user_type VARCHAR(50),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INT,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✓ Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

initDatabase();

module.exports = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};
