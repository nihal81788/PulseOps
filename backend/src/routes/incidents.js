const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { getIncidents, getIncident, acknowledgeIncident } = require('../controllers/incidentController');
const pool = require('../config/db');

router.use(authMiddleware);

router.get('/', getIncidents);
router.get('/:id', getIncident);
router.post('/:id/acknowledge', acknowledgeIncident);

router.post('/:id/snooze', async (req, res) => {
  const minutes = req.body.minutes || 30;
  try {
    await pool.query(
      `UPDATE incidents SET snoozed_until = NOW() + $1::interval WHERE id = $2`,
      [`${minutes} minutes`, req.params.id]
    );
    res.json({ success: true, snoozed_minutes: minutes });
  } catch (error) {
    console.error('Snooze error:', error);
    res.status(500).json({ error: 'Failed to snooze' });
  }
});

module.exports = router;
