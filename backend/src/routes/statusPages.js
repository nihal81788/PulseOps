const router = require('express').Router();
const pool = require('../config/db');

router.get('/:monitorId', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const monitorResult = await pool.query('SELECT * FROM monitors WHERE id = $1', [monitorId]);
    if (monitorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    const monitor = monitorResult.rows[0];

    // Get current status (latest ping)
    const currentStatusResult = await pool.query(
      'SELECT is_up FROM ping_results WHERE monitor_id = $1 ORDER BY time DESC LIMIT 1',
      [monitorId]
    );
    const current_status = currentStatusResult.rows.length > 0 ? (currentStatusResult.rows[0].is_up ? 'online' : 'offline') : 'unknown';

    // Get 30d uptime percent
    const uptime30dResult = await pool.query(
      `SELECT 
        ROUND(
          (COUNT(*) FILTER (WHERE is_up = true) * 100.0) / NULLIF(COUNT(*), 0),
          2
        ) as uptime_percent
       FROM ping_results
       WHERE monitor_id = $1 AND time > NOW() - INTERVAL '30 days'`,
      [monitorId]
    );
    const uptime_30d_percent = parseFloat(uptime30dResult.rows[0].uptime_percent || 0);

    // Get 90d uptime bars
    const uptimeBarsResult = await pool.query(
      `SELECT 
        time_bucket('1 day', time) AS bucket,
        COUNT(*) FILTER (WHERE is_up = true) AS up_count,
        COUNT(*) AS total_count
       FROM ping_results
       WHERE monitor_id = $1 AND time > NOW() - INTERVAL '90 days'
       GROUP BY bucket
       ORDER BY bucket ASC`,
      [monitorId]
    );

    const uptime_bars_90d = uptimeBarsResult.rows.map(row => {
      const percentage = row.total_count > 0 ? (row.up_count / row.total_count) * 100 : 0;
      let color = 'red';
      if (percentage === 100) color = 'green';
      else if (percentage >= 99) color = 'yellow';

      return {
        date: row.bucket,
        uptime_percent: percentage,
        color
      };
    });

    res.json({
      monitor,
      current_status,
      uptime_30d_percent,
      uptime_bars_90d
    });
  } catch (error) {
    console.error('Status page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/badge/:monitorId.svg', async (req, res) => {
  try {
    const { monitorId } = req.params;
    const currentStatusResult = await pool.query(
      'SELECT is_up FROM ping_results WHERE monitor_id = $1 ORDER BY time DESC LIMIT 1',
      [monitorId]
    );
    const isUp = currentStatusResult.rows.length > 0 ? currentStatusResult.rows[0].is_up : false;
    
    const uptime30dResult = await pool.query(
      `SELECT 
        ROUND(
          (COUNT(*) FILTER (WHERE is_up = true) * 100.0) / NULLIF(COUNT(*), 0),
          2
        ) as uptime_percent
       FROM ping_results
       WHERE monitor_id = $1 AND time > NOW() - INTERVAL '30 days'`,
      [monitorId]
    );
    const uptimePercent = parseFloat(uptime30dResult.rows[0].uptime_percent || 0);
    
    const color = isUp ? '#10B981' : '#EF4444'; // green : red
    const statusText = isUp ? 'online' : 'offline';

    // Extremely simple SVG badge
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="20">
      <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
      </linearGradient>
      <mask id="a">
        <rect width="130" height="20" rx="3" fill="#fff"/>
      </mask>
      <g mask="url(#a)">
        <path fill="#555" d="M0 0h65v20H0z"/>
        <path fill="${color}" d="M65 0h65v20H65z"/>
        <path fill="url(#b)" d="M0 0h130v20H0z"/>
      </g>
      <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="32.5" y="15" fill="#010101" fill-opacity=".3">uptime</text>
        <text x="32.5" y="14">uptime</text>
        <text x="97.5" y="15" fill="#010101" fill-opacity=".3">${uptimePercent}%</text>
        <text x="97.5" y="14">${uptimePercent}%</text>
      </g>
    </svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(svg);
  } catch (error) {
    res.status(500).send('Error');
  }
});

module.exports = router;
