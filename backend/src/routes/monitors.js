const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { createMonitor, getMonitors, getMonitor, updateMonitor, deleteMonitor } = require('../controllers/monitorController');

router.use(authMiddleware);

router.post('/', createMonitor);
router.get('/', getMonitors);
router.get('/:id', getMonitor);
router.patch('/:id', updateMonitor);
router.delete('/:id', deleteMonitor);

module.exports = router;
