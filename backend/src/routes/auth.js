const router = require('express').Router();
router.get('/test', (req, res) => res.json({ route: 'auth working' }));
module.exports = router;
