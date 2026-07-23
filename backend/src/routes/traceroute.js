const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const Traceroute = require('nodejs-traceroute');
const pool = require('../config/db');

router.use(authMiddleware);

// POST /api/traceroute { monitor_id }
router.post('/', async (req, res) => {
  try {
    const { monitor_id } = req.body;
    if (!monitor_id) return res.status(400).json({ error: 'monitor_id required' });

    const monitorResult = await pool.query(
      'SELECT url FROM monitors WHERE id = $1 AND user_id = $2',
      [monitor_id, req.userId]
    );

    if (monitorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const url = monitorResult.rows[0].url;
    const hostname = new URL(url).hostname;
    const hops = [];

    res.setHeader('Content-Type', 'application/json');

    const tracer = new Traceroute();

    tracer.on('hop', (hop) => {
      hops.push(hop);
    });

    tracer.on('close', (code) => {
      res.json({
        monitor_id,
        target: hostname,
        hops,
        total_hops: hops.length,
        completed: code === 0,
      });
    });

    tracer.trace(hostname);

  } catch (error) {
    console.error('Traceroute error:', error.message);
    res.status(500).json({ error: 'Traceroute failed: ' + error.message });
  }
});

module.exports = router;
