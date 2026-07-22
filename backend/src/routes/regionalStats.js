const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/monitors/:id/regional-stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT region, 
              COUNT(*) as total, 
              COUNT(*) FILTER (WHERE is_up=true) as up_count, 
              ROUND(AVG(response_time_ms)::numeric,2) as avg_ms 
       FROM ping_results 
       WHERE monitor_id=$1 AND time > NOW() - INTERVAL '24 hours' 
       GROUP BY region 
       ORDER BY region`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
