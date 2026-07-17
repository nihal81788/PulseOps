const { Worker } = require('bullmq');
const got = require('got');
const https = require('https');
const pool = require('../config/db');

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

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
    });
  }

  return result;
}

async function savePingResult(result) {
  try {
    await pool.query(
      `INSERT INTO ping_results
        (time, monitor_id, status_code, is_up, response_time_ms,
         dns_lookup_ms, tcp_connect_ms, tls_handshake_ms, ttfb_ms, error_message)
       VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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

async function checkAndTriggerAlerts(monitorId, result) {
  if (result.isUp) return;
  const recentResults = await pool.query(
    `SELECT is_up FROM ping_results WHERE monitor_id = $1 ORDER BY time DESC LIMIT 10`,
    [monitorId]
  );
  let consecutiveFailures = 0;
  for (const row of recentResults.rows) {
    if (!row.is_up) consecutiveFailures++;
    else break;
  }
  if (consecutiveFailures >= 2) {
    console.log(`🚨 ALERT: Monitor ${monitorId} has ${consecutiveFailures} consecutive failures`);
  }
}

const pingWorker = new Worker('ping-queue', processPingJob, {
  connection: redisConnection,
  concurrency: 5,
});

pingWorker.on('failed', (job, error) => {
  console.error(`❌ Worker job failed for monitor ${job?.data?.monitorId}:`, error.message);
});

pingWorker.on('error', (error) => {
  console.error('Worker error:', error);
});

console.log('🔄 Ping worker started with concurrency: 5');

module.exports = pingWorker;
