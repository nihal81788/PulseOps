const pool = require('./src/config/db');

async function run() {
  try {
    await pool.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS expected_keyword TEXT DEFAULT NULL;`);
    console.log('Column added successfully.');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    process.exit();
  }
}

run();
