require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'PulseOps API' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/monitors', require('./routes/monitors'));
app.use('/api/alert-rules', require('./routes/alertRules'));
app.use('/api', require('./routes/stats'));
app.get('/api/monitors/:id/uptime-bars', require('./controllers/statsController').getUptimeBars);
app.get('/api/monitors/:id/ping-now-history', require('./controllers/statsController').getPingHistory);

app.get('/api/workers/status', async (req, res) => {
  const { getQueueStats } = require('./queues/pingQueue');
  try {
    const stats = await getQueueStats();
    res.json({ status: 'running', queue: stats });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.post('/api/monitors/:id/ping-now', async (req, res) => {
  const pool = require('./config/db');
  const { pingQueue } = require('./queues/pingQueue');
  const monitor = await pool.query('SELECT * FROM monitors WHERE id = $1', [req.params.id]);
  if (monitor.rows.length === 0) return res.status(404).json({ error: 'Monitor not found' });
  const m = monitor.rows[0];
  await pingQueue.add('ping', { monitorId: m.id, url: m.url }, { priority: 1 });
  res.json({ message: 'Ping queued. Check terminal for result.' });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`🚀 PulseOps backend running on http://localhost:${PORT}`));

require('./workers/pingWorker');

async function restoreMonitorSchedules() {
  const pool = require('./config/db');
  const { scheduleMonitor } = require('./queues/pingQueue');
  try {
    const result = await pool.query('SELECT id, url, check_interval FROM monitors WHERE is_active = true');
    console.log(`🔄 Restoring ${result.rows.length} monitor schedules...`);
    for (const monitor of result.rows) {
      await scheduleMonitor(monitor.id, monitor.url, monitor.check_interval);
    }
    console.log('✅ All monitor schedules restored');
  } catch (error) {
    console.error('Failed to restore schedules:', error);
  }
}

restoreMonitorSchedules();

module.exports = app;
