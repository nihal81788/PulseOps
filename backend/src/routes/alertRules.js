const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const { monitor_id, channel, destination, trigger_level = 2, cooldown_minutes = 15 } = req.body;
    if (!monitor_id || !channel || !destination) {
      return res.status(400).json({ error: 'monitor_id, channel, and destination are required' });
    }
    const validChannels = ['email', 'sms', 'slack', 'discord'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ error: `channel must be one of: ${validChannels.join(', ')}` });
    }
    const monitor = await pool.query('SELECT id FROM monitors WHERE id = $1 AND user_id = $2', [monitor_id, req.userId]);
    if (monitor.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    const result = await pool.query(
      `INSERT INTO alert_rules (monitor_id, channel, destination, trigger_level, cooldown_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [monitor_id, channel, destination, trigger_level, cooldown_minutes]
    );
    res.status(201).json({ alert_rule: result.rows[0] });
  } catch (error) {
    console.error('CreateAlertRule error:', error);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { monitor_id } = req.query;
    if (!monitor_id) return res.status(400).json({ error: 'monitor_id query param required' });
    const result = await pool.query('SELECT * FROM alert_rules WHERE monitor_id = $1 ORDER BY created_at DESC', [monitor_id]);
    res.json({ alert_rules: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

module.exports = router;
