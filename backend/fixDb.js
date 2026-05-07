require('dotenv').config();
const db = require('./db/db');

async function fixDb() {
  try {
    // Fix drivers status constraint
    await db.query(`ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_status_check;`);
    await db.query(`ALTER TABLE drivers ADD CONSTRAINT drivers_status_check CHECK (status IN ('IDLE', 'ACTIVE', 'BUSY'));`);
    console.log('Fixed driver constraints');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

fixDb();
