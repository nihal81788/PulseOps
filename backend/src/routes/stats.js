const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const {
  getLatencyStats,
  getSLAReport,
  getSSLInfo,
  getHeatmapData,
  getPingHistory,
} = require('../controllers/statsController');

router.use(authMiddleware);

router.get('/monitors/:id/stats', getLatencyStats);
router.get('/monitors/:id/sla', getSLAReport);
router.get('/monitors/:id/ssl', getSSLInfo);
router.get('/monitors/:id/heatmap', getHeatmapData);
router.get('/monitors/:id/history', getPingHistory);

module.exports = router;
