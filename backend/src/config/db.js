const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'pulseops_user',
  password: process.env.DB_PASSWORD || 'pulseops_secret',
  database: process.env.DB_NAME || 'pulseops_db',
});

pool.on('connect', () => console.log('✅ Connected to TimescaleDB'));
pool.on('error', (err) => { console.error('❌ DB error:', err); process.exit(1); });

module.exports = pool;
