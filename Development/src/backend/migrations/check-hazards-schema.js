require('dotenv').config();
const { pool } = require('../config/database');

async function checkSchema() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hazards' ORDER BY ordinal_position"
    );
    console.log('Hazards table columns:');
    result.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
