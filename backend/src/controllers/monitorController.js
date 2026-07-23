const pool = require('../config/db');
const { scheduleMonitor, cancelMonitorJob } = require('../queues/pingQueue');

const VALID_INTERVALS = [30, 60, 300];

const createMonitor = async (req, res) => {
  try {
    const { name, url, check_interval = 60, expected_keyword = null } = req.body;
    const userId = req.userId;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'URL must start with http:// or https://' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    if (!VALID_INTERVALS.includes(Number(check_interval))) {
      return res.status(400).json({ error: `check_interval must be one of: ${VALID_INTERVALS.join(', ')} seconds` });
    }
    const duplicate = await pool.query('SELECT id FROM monitors WHERE user_id = $1 AND url = $2', [userId, url]);
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ error: 'You are already monitoring this URL' });
    }
    const result = await pool.query(
      `INSERT INTO monitors (user_id, name, url, check_interval, expected_keyword) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, name.trim(), url, Number(check_interval), expected_keyword]
    );
    const newMonitor = result.rows[0];

    // Auto-create a default email alert rule (Level 1 escalation: after 2 failures)
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length > 0) {
      await pool.query(
        `INSERT INTO alert_rules (monitor_id, channel, destination, trigger_level, cooldown_minutes) 
         VALUES ($1, 'email', $2, 2, 15)`,
        [newMonitor.id, userRes.rows[0].email]
      );
    }

    await scheduleMonitor(newMonitor.id, url, Number(check_interval));
    res.status(201).json({ message: 'Monitor created successfully', monitor: newMonitor });
  } catch (error) {
    console.error('CreateMonitor error:', error);
    res.status(500).json({ error: 'Failed to create monitor' });
  }
};

const getMonitors = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      `SELECT m.*,
        (SELECT is_up FROM ping_results WHERE monitor_id = m.id ORDER BY time DESC LIMIT 1) AS is_currently_up,
        (SELECT response_time_ms FROM ping_results WHERE monitor_id = m.id ORDER BY time DESC LIMIT 1) AS last_response_time_ms,
        (SELECT time FROM ping_results WHERE monitor_id = m.id ORDER BY time DESC LIMIT 1) AS last_checked_at
       FROM monitors m WHERE m.user_id = $1 ORDER BY m.created_at DESC`,
      [userId]
    );
    res.json({ monitors: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('GetMonitors error:', error);
    res.status(500).json({ error: 'Failed to fetch monitors' });
  }
};

const getMonitor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await pool.query('SELECT * FROM monitors WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    res.json({ monitor: result.rows[0] });
  } catch (error) {
    console.error('GetMonitor error:', error);
    res.status(500).json({ error: 'Failed to fetch monitor' });
  }
};

const updateMonitor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { name, check_interval, is_active } = req.body;
    const existing = await pool.query('SELECT id FROM monitors WHERE id = $1 AND user_id = $2', [id, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name.trim()); }
    if (check_interval !== undefined) {
      if (!VALID_INTERVALS.includes(Number(check_interval))) {
        return res.status(400).json({ error: 'Invalid check_interval' });
      }
      updates.push(`check_interval = $${paramIndex++}`);
      values.push(Number(check_interval));
    }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(Boolean(is_active)); }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE monitors SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    const m = result.rows[0];
    if (m.is_active) {
      await scheduleMonitor(m.id, m.url, m.check_interval);
    } else {
      await cancelMonitorJob(m.id);
    }
    res.json({ message: 'Monitor updated', monitor: m });
  } catch (error) {
    console.error('UpdateMonitor error:', error);
    res.status(500).json({ error: 'Failed to update monitor' });
  }
};

const deleteMonitor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await pool.query('DELETE FROM monitors WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    await cancelMonitorJob(id);
    res.json({ message: 'Monitor deleted successfully' });
  } catch (error) {
    console.error('DeleteMonitor error:', error);
    res.status(500).json({ error: 'Failed to delete monitor' });
  }
};

module.exports = { createMonitor, getMonitors, getMonitor, updateMonitor, deleteMonitor };
