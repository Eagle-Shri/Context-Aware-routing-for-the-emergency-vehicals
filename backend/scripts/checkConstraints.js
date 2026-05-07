require('dotenv').config({path: '../.env'});
const db = require('../db/db'); 
db.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conname IN ('police_officers_status_check', 'incidents_type_check', 'incidents_severity_check');")
.then(r => console.log(r.rows))
.catch(e=>console.error(e))
.finally(() => process.exit(0));
