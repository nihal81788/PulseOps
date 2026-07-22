const { Worker } = require('bullmq');
const got = require('got');
const https = require('https');
const pool = require('../config/db');

const redisConnection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

const REGIONS = ['us-east', 'eu-west', 'ap-south', 'us-west'];
const processingTimes = [];

async function processPingJob(job) {
  const { monitorId, url } = job.data;
  const startTime = Date.now();

  let result = {
    monitorId,
    isUp: false,
    statusCode: null,
    errorMessage: null,
    dnsLookupMs: null,
    tcpConnectMs: null,
    tlsHandshakeMs: null,
    ttfbMs: null,
    totalMs: null,
    region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
    contentWarning: false,
    contentWarningMessage: null,
  };

  try {
    const response = await got(url, {
      timeout: { request: 10000, connect: 5000 },
      followRedirect: true,
      retry: { limit: 0 },
      https: { rejectUnauthorized: false },
    });

    const t = response.timings.phases;
    result.isUp = response.statusCode < 400;
    result.statusCode = response.statusCode;
    result.dnsLookupMs = t.dns || 0;
    result.tcpConnectMs = t.tcp || 0;
    result.tlsHandshakeMs = t.tls || 0;
    result.ttfbMs = t.firstByte || 0;
    result.totalMs = t.total || (Date.now() - startTime);

    const contentType = response.headers['content-type'] || '';
    const bodyStr = typeof response.body === 'string' ? response.body.toLowerCase() : '';
    const errorIndicators = ['<title>404</title>', 'not found', 'error', 'forbidden', 'access denied'];
    
    if (errorIndicators.some(indicator => bodyStr.includes(indicator))) {
      result.contentWarning = true;
      result.contentWarningMessage = 'Response body contains error indicators';
    }

    if (url.startsWith('https://')) {
      await extractAndSaveSSLInfo(monitorId, url);
    }

    console.log(`✅ [${monitorId}] ${url} — ${result.statusCode} in ${result.totalMs}ms`);

  } catch (error) {
    result.isUp = false;
    result.totalMs = Date.now() - startTime;

    if (error.code === 'ETIMEDOUT') result.errorMessage = 'Connection timed out';
    else if (error.code === 'ECONNREFUSED') result.errorMessage = 'Connection refused';
    else if (error.code === 'ENOTFOUND') result.errorMessage = 'DNS lookup failed';
    else if (error.response) {
      result.statusCode = error.response.statusCode;
      result.errorMessage = `HTTP ${error.response.statusCode}`;
      const t = error.timings?.phases;
      if (t) {
        result.dnsLookupMs = t.dns || 0;
        result.tcpConnectMs = t.tcp || 0;
        result.tlsHandshakeMs = t.tls || 0;
        result.ttfbMs = t.firstByte || 0;
        result.totalMs = t.total || result.totalMs;
      }
    } else {
      result.errorMessage = error.message || 'Unknown error';
    }

    console.error(`❌ [${monitorId}] ${url} — ${result.errorMessage}`);
  }

  await savePingResult(result);
  await checkAndTriggerAlerts(monitorId, result);

  if (global.io) {
    global.io.to(`monitor:${monitorId}`).emit('ping-result', {
      monitorId: result.monitorId,
      isUp: result.isUp,
      statusCode: result.statusCode,
      responseTimeMs: result.totalMs,
      dnsLookupMs: result.dnsLookupMs,
      tlsHandshakeMs: result.tlsHandshakeMs,
      timestamp: new Date().toISOString(),
      region: result.region,
      contentWarning: result.contentWarning,
    });
  }

  const processTime = Date.now() - (job.processedOn || startTime);
  processingTimes.push(processTime);
  if (processingTimes.length > 100) processingTimes.shift();

  return result;
}

async function savePingResult(result) {
  try {
    await pool.query(
      `INSERT INTO ping_results
        (time, monitor_id, status_code, is_up, response_time_ms,
         dns_lookup_ms, tcp_connect_ms, tls_handshake_ms, ttfb_ms, error_message, region, content_warning)
       VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        result.monitorId,
        result.statusCode,
        result.isUp,
        result.totalMs,
        result.dnsLookupMs,
        result.tcpConnectMs,
        result.tlsHandshakeMs,
        result.ttfbMs,
        result.errorMessage,
        result.region,
        result.contentWarning,
      ]
    );
  } catch (error) {
    console.error('Failed to save ping result:', error.message);
  }
}

async function extractAndSaveSSLInfo(monitorId, url) {
  try {
    const parsedUrl = new URL(url);
    await new Promise((resolve) => {
      const req = https.request(
        { host: parsedUrl.hostname, port: 443, method: 'HEAD', rejectUnauthorized: false },
        (res) => {
          const cert = res.socket.getPeerCertificate();
          if (!cert || !cert.subject) { resolve(); return; }
          const validTo = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor((validTo - new Date()) / (1000 * 60 * 60 * 24));
          pool.query(
            `INSERT INTO ssl_certificates
              (monitor_id, issuer, subject, valid_from, valid_to, key_algorithm, is_valid, days_until_expiry, last_checked_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (monitor_id)
             DO UPDATE SET issuer=EXCLUDED.issuer, subject=EXCLUDED.subject,
               valid_from=EXCLUDED.valid_from, valid_to=EXCLUDED.valid_to,
               key_algorithm=EXCLUDED.key_algorithm, is_valid=EXCLUDED.is_valid,
               days_until_expiry=EXCLUDED.days_until_expiry, last_checked_at=NOW()`,
            [
              monitorId,
              JSON.stringify(cert.issuer),
              JSON.stringify(cert.subject),
              new Date(cert.valid_from),
              validTo,
              cert.bits ? `RSA-${cert.bits}` : 'Unknown',
              daysUntilExpiry > 0,
              daysUntilExpiry,
            ]
          ).catch(console.error);
          resolve();
        }
      );
      req.on('error', () => resolve());
      req.end();
    });
  } catch (error) {
    console.error('SSL extraction failed:', error.message);
  }
}

const { dispatchAlerts, sendResolutionAlert } = require('../services/alertService');
const { createIncident, resolveIncident } = require('../controllers/incidentController');

async function checkAndTriggerAlerts(monitorId, result) {
  const recentResults = await pool.query(
    `SELECT is_up, error_message FROM ping_results WHERE monitor_id = $1 ORDER BY time DESC LIMIT 10`,
    [monitorId]
  );

  if (recentResults.rows.length === 0) return;

  let consecutiveFailures = 0;
  let wasUpBefore = false;

  for (let i = 0; i < recentResults.rows.length; i++) {
    const row = recentResults.rows[i];
    if (i === 0 && row.is_up) {
      wasUpBefore = true;
      break;
    }
    if (!row.is_up) consecutiveFailures++;
    else break;
  }

  if (wasUpBefore && recentResults.rows.length > 1 && !recentResults.rows[1].is_up) {
    console.log(`✅ Monitor ${monitorId} recovered`);
    await resolveIncident(monitorId);
    await sendResolutionAlert(monitorId);
    return;
  }

  if (consecutiveFailures === 0) return;

  console.log(`⚠️ Monitor ${monitorId}: ${consecutiveFailures} consecutive failures`);

  if (consecutiveFailures >= 2) {
    await createIncident(monitorId);
  }

  await dispatchAlerts(monitorId, consecutiveFailures, result.errorMessage || `HTTP ${result.statusCode}`);
}

const pingWorker = new Worker('ping-queue', processPingJob, {
  connection: redisConnection,
  concurrency: 3,
});

async function adjustWorkerConcurrency() {
  const { getQueueStats } = require('../queues/pingQueue');
  try {
    const stats = await getQueueStats();
    if (stats.waiting > 50) pingWorker.concurrency = 20;
    else if (stats.waiting > 20) pingWorker.concurrency = 10;
    else if (stats.waiting < 5) pingWorker.concurrency = 3;
  } catch (e) {
    console.error('Failed to adjust concurrency', e.message);
  }
}
setInterval(adjustWorkerConcurrency, 15000);

async function getWorkerStats() {
  const { getQueueStats } = require('../queues/pingQueue');
  const stats = await getQueueStats();
  const avgProcessingMs = processingTimes.length ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;
  return {
    concurrency: pingWorker.concurrency,
    avgProcessingMs,
    queueDepth: stats.waiting
  };
}

pingWorker.on('failed', (job, error) => {
  console.error(`❌ Worker job failed for monitor ${job?.data?.monitorId}:`, error.message);
});

pingWorker.on('error', (error) => {
  console.error('Worker error:', error);
});

console.log('🔄 Ping worker started with concurrency: 3');

module.exports = { pingWorker, getWorkerStats };
