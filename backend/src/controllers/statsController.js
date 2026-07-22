const pool = require('../config/db');

async function verifyMonitorOwnership(monitorId, userId) {
  const result = await pool.query(
    'SELECT id FROM monitors WHERE id = $1 AND user_id = $2',
    [monitorId, userId]
  );
  return result.rows.length > 0;
}

const getLatencyStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { window = '24h' } = req.query;

    if (!await verifyMonitorOwnership(id, req.userId)) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const intervalMap = { '1h': '1 hour', '24h': '24 hours', '7d': '7 days', '30d': '30 days' };
    const interval = intervalMap[window];
    if (!interval) {
      return res.status(400).json({ error: 'window must be one of: 1h, 24h, 7d, 30d' });
    }

    const statsResult = await pool.query(
      `SELECT
        COUNT(*) AS total_checks,
        COUNT(*) FILTER (WHERE is_up = true) AS successful_checks,
        ROUND(AVG(response_time_ms)::numeric, 2) AS avg_ms,
        ROUND(MIN(response_time_ms)::numeric, 2) AS min_ms,
        ROUND(MAX(response_time_ms)::numeric, 2) AS max_ms,
        ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY response_time_ms)::numeric, 2) AS p50_ms,
        ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms)::numeric, 2) AS p95_ms,
        ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY response_time_ms)::numeric, 2) AS p99_ms,
        ROUND(AVG(dns_lookup_ms)::numeric, 2) AS avg_dns_ms,
        ROUND(AVG(tcp_connect_ms)::numeric, 2) AS avg_tcp_ms,
        ROUND(AVG(tls_handshake_ms)::numeric, 2) AS avg_tls_ms,
        ROUND(AVG(ttfb_ms)::numeric, 2) AS avg_ttfb_ms
       FROM ping_results
       WHERE monitor_id = $1
         AND time > NOW() - INTERVAL '${interval}'
         AND response_time_ms IS NOT NULL`,
      [id]
    );

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total_checks);
    const successful = parseInt(stats.successful_checks);

    let regression = null;
    if (window === '24h' || window === '1h') {
      const regressionResult = await pool.query(
        `SELECT ROUND(AVG(response_time_ms)::numeric, 2) AS trailing_7d_avg
         FROM ping_results
         WHERE monitor_id = $1
           AND time > NOW() - INTERVAL '7 days'
           AND time <= NOW() - INTERVAL '24 hours'
           AND response_time_ms IS NOT NULL`,
        [id]
      );
      const trailing7dAvg = parseFloat(regressionResult.rows[0]?.trailing_7d_avg);
      const currentAvg = parseFloat(stats.avg_ms);
      if (trailing7dAvg && currentAvg) {
        const changePercent = ((currentAvg - trailing7dAvg) / trailing7dAvg) * 100;
        regression = {
          trailing_7d_avg_ms: trailing7dAvg,
          current_avg_ms: currentAvg,
          change_percent: parseFloat(changePercent.toFixed(2)),
          is_regression: changePercent > 20,
        };
        if (regression.is_regression) {
          console.warn(`⚠️ REGRESSION: Monitor ${id} is ${changePercent.toFixed(1)}% slower than 7-day average`);
        }
      }
    }

    res.json({
      monitor_id: id,
      window,
      period: interval,
      total_checks: total,
      successful_checks: successful,
      uptime_percent: total > 0 ? parseFloat(((successful / total) * 100).toFixed(3)) : null,
      latency: {
        avg_ms: parseFloat(stats.avg_ms) || null,
        min_ms: parseFloat(stats.min_ms) || null,
        max_ms: parseFloat(stats.max_ms) || null,
        p50_ms: parseFloat(stats.p50_ms) || null,
        p95_ms: parseFloat(stats.p95_ms) || null,
        p99_ms: parseFloat(stats.p99_ms) || null,
      },
      breakdown: {
        avg_dns_ms: parseFloat(stats.avg_dns_ms) || null,
        avg_tcp_ms: parseFloat(stats.avg_tcp_ms) || null,
        avg_tls_ms: parseFloat(stats.avg_tls_ms) || null,
        avg_ttfb_ms: parseFloat(stats.avg_ttfb_ms) || null,
      },
      regression,
    });
  } catch (error) {
    console.error('GetLatencyStats error:', error);
    res.status(500).json({ error: 'Failed to calculate latency stats' });
  }
};

const getSLAReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { target = '99.9', period = '30d' } = req.query;

    if (!await verifyMonitorOwnership(id, req.userId)) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const targetPercent = parseFloat(target);
    if (isNaN(targetPercent) || targetPercent < 90 || targetPercent > 100) {
      return res.status(400).json({ error: 'target must be between 90 and 100' });
    }

    const intervalMap = { '7d': '7 days', '30d': '30 days', '90d': '90 days' };
    const interval = intervalMap[period] || '30 days';

    const result = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_up = true) AS up_count,
        COUNT(*) FILTER (WHERE is_up = false) AS down_count,
        COUNT(*) FILTER (WHERE is_up = false) * (
          SELECT check_interval FROM monitors WHERE id = $1
        ) / 60.0 AS estimated_downtime_minutes
       FROM ping_results
       WHERE monitor_id = $1
         AND time > NOW() - INTERVAL '${interval}'`,
      [id]
    );

    const row = result.rows[0];
    const total = parseInt(row.total);
    const upCount = parseInt(row.up_count);
    const actualUptimePercent = total > 0 ? (upCount / total) * 100 : 100;
    const estimatedDowntimeMinutes = parseFloat(row.estimated_downtime_minutes) || 0;

    const periodMinutes = { '7d': 7*24*60, '30d': 30*24*60, '90d': 90*24*60 }[period] || 30*24*60;
    const allowedDowntimeMinutes = (1 - targetPercent / 100) * periodMinutes;
    const remainingBudgetMinutes = allowedDowntimeMinutes - estimatedDowntimeMinutes;

    res.json({
      monitor_id: id,
      period,
      sla_target_percent: targetPercent,
      actual_uptime_percent: parseFloat(actualUptimePercent.toFixed(4)),
      is_sla_breached: actualUptimePercent < targetPercent,
      total_checks: total,
      up_count: upCount,
      down_count: parseInt(row.down_count),
      estimated_downtime_minutes: parseFloat(estimatedDowntimeMinutes.toFixed(2)),
      sla_budget: {
        allowed_downtime_minutes: parseFloat(allowedDowntimeMinutes.toFixed(2)),
        used_minutes: parseFloat(estimatedDowntimeMinutes.toFixed(2)),
        remaining_minutes: parseFloat(remainingBudgetMinutes.toFixed(2)),
        is_exhausted: remainingBudgetMinutes < 0,
      },
    });
  } catch (error) {
    console.error('GetSLAReport error:', error);
    res.status(500).json({ error: 'Failed to generate SLA report' });
  }
};

const getSSLInfo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!await verifyMonitorOwnership(id, req.userId)) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    const result = await pool.query('SELECT * FROM ssl_certificates WHERE monitor_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.json({ monitor_id: id, ssl: null, message: 'No SSL data yet.' });
    }
    const cert = result.rows[0];
    const warning = cert.days_until_expiry !== null && cert.days_until_expiry <= 14;
    res.json({
      monitor_id: id,
      ssl: {
        ...cert,
        expiry_warning: warning,
        expiry_warning_message: warning ? `⚠️ Certificate expires in ${cert.days_until_expiry} days!` : null,
      }
    });
  } catch (error) {
    console.error('GetSSLInfo error:', error);
    res.status(500).json({ error: 'Failed to fetch SSL info' });
  }
};

const getUptimeBars = async (req, res) => {
  try {
    const { id } = req.params;
    const monitor = await pool.query('SELECT id, name, url FROM monitors WHERE id = $1', [id]);
    if (monitor.rows.length === 0) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    const result = await pool.query(
      `SELECT
        date_trunc('day', time) AS day,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_up = true) AS up_count,
        ROUND(
          (COUNT(*) FILTER (WHERE is_up = true)::float / COUNT(*) * 100)::numeric, 3
        ) AS uptime_percent
       FROM ping_results
       WHERE monitor_id = $1
         AND time > NOW() - INTERVAL '90 days'
       GROUP BY day
       ORDER BY day ASC`,
      [id]
    );
    const bars = result.rows.map(row => {
      const pct = parseFloat(row.uptime_percent);
      let color;
      if (pct === 100) color = 'green';
      else if (pct >= 99) color = 'yellow';
      else color = 'red';
      return { date: row.day, uptime_percent: pct, total_checks: parseInt(row.total), color };
    });
    res.json({ monitor_id: id, monitor_name: monitor.rows[0].name, monitor_url: monitor.rows[0].url, bars, days_with_data: bars.length });
  } catch (error) {
    console.error('GetUptimeBars error:', error);
    res.status(500).json({ error: 'Failed to generate uptime bars' });
  }
};

const getHeatmapData = async (req, res) => {
  try {
    const { id } = req.params;
    if (!await verifyMonitorOwnership(id, req.userId)) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    const result = await pool.query(
      `SELECT
        EXTRACT(DOW FROM time)::integer AS day_of_week,
        EXTRACT(HOUR FROM time)::integer AS hour_of_day,
        ROUND(AVG(response_time_ms)::numeric, 2) AS avg_ms,
        COUNT(*) AS sample_count
       FROM ping_results
       WHERE monitor_id = $1
         AND time > NOW() - INTERVAL '30 days'
         AND response_time_ms IS NOT NULL
         AND is_up = true
       GROUP BY day_of_week, hour_of_day
       ORDER BY day_of_week, hour_of_day`,
      [id]
    );
    const grid = result.rows.map(row => ({
      day: row.day_of_week,
      hour: row.hour_of_day,
      avg_ms: parseFloat(row.avg_ms),
      samples: parseInt(row.sample_count),
    }));
    res.json({
      monitor_id: id,
      heatmap: grid,
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    });
  } catch (error) {
    console.error('GetHeatmapData error:', error);
    res.status(500).json({ error: 'Failed to generate heatmap data' });
  }
};

const getPingHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.query;

    if (!await verifyMonitorOwnership(id, req.userId)) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const results = await pool.query(
      `SELECT time, is_up, status_code, response_time_ms, dns_lookup_ms, tls_handshake_ms, error_message
       FROM ping_results
       WHERE monitor_id = $1
         AND time > NOW() - INTERVAL '${parseInt(hours)} hours'
       ORDER BY time DESC
       LIMIT 1000`,
      [id]
    );

    const total = results.rows.length;
    const upCount = results.rows.filter(r => r.is_up).length;
    const uptimePercent = total > 0 ? ((upCount / total) * 100).toFixed(3) : null;

    res.json({
      monitor_id: id,
      period_hours: parseInt(hours),
      uptime_percent: uptimePercent,
      total_checks: total,
      results: results.rows,
    });
  } catch (error) {
    console.error('PingHistory error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

module.exports = { getLatencyStats, getSLAReport, getSSLInfo, getUptimeBars, getHeatmapData, getPingHistory };
