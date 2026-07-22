const { Queue } = require('bullmq');

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const pingQueue = new Queue('ping-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

async function scheduleMonitor(monitorId, url, intervalSeconds) {
  const jobId = `monitor-${monitorId}`;
  await cancelMonitorJob(monitorId);
  
  // Fire an immediate ping so the user gets instant feedback
  await pingQueue.add('ping', { monitorId, url }, { priority: 1, jobId: `immediate-${monitorId}-${Date.now()}` });

  await pingQueue.add(
    'ping',
    { monitorId, url },
    {
      jobId,
      repeat: {
        every: intervalSeconds * 1000,
      },
    }
  );
  console.log(`✅ Scheduled monitor ${monitorId} (${url}) every ${intervalSeconds}s`);
}

async function cancelMonitorJob(monitorId) {
  const jobId = `monitor-${monitorId}`;
  const repeatableJobs = await pingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === jobId) {
      await pingQueue.removeRepeatableByKey(job.key);
      console.log(`🗑️ Removed scheduled job for monitor ${monitorId}`);
    }
  }
}

async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    pingQueue.getWaitingCount(),
    pingQueue.getActiveCount(),
    pingQueue.getCompletedCount(),
    pingQueue.getFailedCount(),
    pingQueue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}

module.exports = { pingQueue, scheduleMonitor, cancelMonitorJob, getQueueStats };
