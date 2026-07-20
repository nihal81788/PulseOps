const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { getIncidents, getIncident, acknowledgeIncident } = require('../controllers/incidentController');

router.use(authMiddleware);

router.get('/', getIncidents);
router.get('/:id', getIncident);
router.post('/:id/acknowledge', acknowledgeIncident);

module.exports = router;
