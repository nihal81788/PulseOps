const router = require('express').Router();
router.get('/test', (req, res) => res.json({ route: 'monitors working' }));
module.exports = router;
