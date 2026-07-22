require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(morgan('dev'));
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

global.io = io;
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('subscribe', (monitorIds) => {
    if (Array.isArray(monitorIds)) {
      monitorIds.forEach((id) => socket.join(`monitor:${id}`));
      console.log(`📡 Client ${socket.id} subscribed to monitors: ${monitorIds.join(', ')}`);
    }
  });
  
  socket.on('unsubscribe', (monitorIds) => {
    if (Array.isArray(monitorIds)) {
      monitorIds.forEach((id) => socket.leave(`monitor:${id}`));
      console.log(`🔌 Client ${socket.id} unsubscribed from monitors: ${monitorIds.join(', ')}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'PulseOps API' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/monitors', require('./routes/monitors'));
app.use('/api/alert-rules', require('./routes/alertRules'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/oncall', require('./routes/oncall'));
app.use('/api', require('./routes/stats'));
app.use('/api', require('./routes/regionalStats'));
app.use('/status', require('./routes/statusPages'));
app.get('/api/monitors/:id/uptime-bars', require('./controllers/statsController').getUptimeBars);
app.get('/api/monitors/:id/ping-now-history', require('./controllers/statsController').getPingHistory);

app.get('/api/workers/status', async (req, res) => {
  const { getQueueStats } = require('./queues/pingQueue');
  const pingWorker = require('./workers/pingWorker');
  try {
    const stats = await getQueueStats();
    let workerStats = {};
    if (pingWorker.getWorkerStats) {
      workerStats = await pingWorker.getWorkerStats();
    }
    res.json({ status: 'running', queue: stats, ...workerStats });
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

httpServer.listen(PORT, () => console.log(`🚀 PulseOps backend running on http://localhost:${PORT}`));

require('./workers/pingWorker');

async function restoreMonitorSchedules() {
  const pool = require('./config/db');
  const { scheduleMonitor } = require('./queues/pingQueue');
  try {
    const result = await pool.query('SELECT id, url, check_interval FROM monitors WHERE is_active = true');
    for (const monitor of result.rows) {
      await scheduleMonitor(monitor.id, monitor.url, monitor.check_interval);
    }
  } catch (error) {
    console.error('Failed to restore schedules:', error);
  }
}

restoreMonitorSchedules();

module.exports = { app, io, httpServer };
