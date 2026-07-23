const pool = require('../config/db');

async function createIncident(monitorId) {
  try {
    // Check if monitor still exists before creating incident (prevents FK error if deleted)
    const monitorExists = await pool.query('SELECT id FROM monitors WHERE id = $1', [monitorId]);
    if (monitorExists.rows.length === 0) return null;

    const existing = await pool.query(
      'SELECT id FROM incidents WHERE monitor_id = $1 AND is_resolved = false',
      [monitorId]
    );
    if (existing.rows.length > 0) return existing.rows[0].id;

    const result = await pool.query(
      'INSERT INTO incidents (monitor_id) VALUES ($1) RETURNING id',
      [monitorId]
    );
    console.log(`🚨 Incident created: ${result.rows[0].id} for monitor ${monitorId}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('createIncident error:', error);
    return null;
  }
}

async function resolveIncident(monitorId) {
  try {
    const result = await pool.query(
      `UPDATE incidents SET is_resolved = true, resolved_at = NOW()
       WHERE monitor_id = $1 AND is_resolved = false RETURNING id`,
      [monitorId]
    );
    if (result.rows.length > 0) {
      console.log(`✅ Incident resolved: ${result.rows[0].id}`);
    }
  } catch (error) {
    console.error('resolveIncident error:', error);
  }
}

const getIncidents = async (req, res) => {
  try {
    const { resolved = 'false', limit = 20 } = req.query;
    const result = await pool.query(
      `SELECT i.*, m.name AS monitor_name, m.url AS monitor_url,
        EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, NOW()) - i.started_at)) / 60 AS duration_minutes
       FROM incidents i
       JOIN monitors m ON m.id = i.monitor_id
       WHERE m.user_id = $1
         AND ($2 = 'all' OR i.is_resolved = ($2 = 'true'))
       ORDER BY i.started_at DESC
       LIMIT $3`,
      [req.userId, resolved, parseInt(limit)]
    );
    res.json({ incidents: result.rows });
  } catch (error) {
    console.error('getIncidents error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

const getIncident = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, m.name AS monitor_name, m.url AS monitor_url
       FROM incidents i
       JOIN monitors m ON m.id = i.monitor_id
       WHERE i.id = $1 AND m.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
};

const acknowledgeIncident = async (req, res) => {
  try {
    const { root_cause, resolution_notes } = req.body;
    const result = await pool.query(
      `UPDATE incidents
       SET root_cause = COALESCE($1, root_cause),
           resolution_notes = COALESCE($2, resolution_notes)
       WHERE id = $3 RETURNING *`,
      [root_cause, resolution_notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
    res.json({ message: 'Incident acknowledged', incident: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to acknowledge incident' });
  }
};

module.exports = { createIncident, resolveIncident, getIncidents, getIncident, acknowledgeIncident };
