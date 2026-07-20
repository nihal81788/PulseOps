const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const pool = require('../config/db');

router.use(authMiddleware);

router.post('/', async (req, res) => {
  try {
    const { monitor_id, user_id, start_time, end_time } = req.body;
    if (!monitor_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'monitor_id, start_time, end_time required' });
    }
    const result = await pool.query(
      'INSERT INTO oncall_schedules (user_id, monitor_id, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id || req.userId, monitor_id, start_time, end_time]
    );
    res.status(201).json({ schedule: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { monitor_id } = req.query;
    const result = await pool.query(
      `SELECT os.*, u.name AS user_name, u.email AS user_email
       FROM oncall_schedules os
       JOIN users u ON u.id = os.user_id
       WHERE os.monitor_id = $1
       ORDER BY os.start_time ASC`,
      [monitor_id]
    );
    res.json({ schedules: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

module.exports = router;
