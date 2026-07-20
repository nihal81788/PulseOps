const nodemailer = require('nodemailer');
const pool = require('../config/db');

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

emailTransporter.verify((error) => {
  if (error) {
    console.error('❌ Email config error:', error.message);
  } else {
    console.log('✅ Email transporter ready');
  }
});

async function sendEmailAlert(destination, monitorName, monitorUrl, message) {
  try {
    const info = await emailTransporter.sendMail({
      from: `"PulseOps Alerts" <${process.env.SMTP_USER}>`,
      to: destination,
      subject: `🚨 [PulseOps] ${monitorName} is DOWN`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #dc2626;">🚨 Downtime Alert</h2>
          <p><strong>Monitor:</strong> ${monitorName}</p>
          <p><strong>URL:</strong> <a href="${monitorUrl}">${monitorUrl}</a></p>
          <p><strong>Issue:</strong> ${message}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">You received this because you have an alert rule configured in PulseOps.</p>
        </div>
      `,
    });
    console.log(`📧 Email sent to ${destination} — MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
}

async function sendSlackAlert(webhookUrl, monitorName, monitorUrl, message, failureCount) {
  try {
    const { IncomingWebhook } = require('@slack/webhook');
    const webhook = new IncomingWebhook(webhookUrl);
    await webhook.send({
      text: `🚨 *${monitorName}* is DOWN`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚨 *Downtime Alert — ${monitorName}*\n*URL:* ${monitorUrl}\n*Error:* ${message}\n*Failures:* ${failureCount} consecutive\n*Time:* ${new Date().toISOString()}`,
          },
        },
      ],
    });
    console.log('💬 Slack alert sent');
    return true;
  } catch (error) {
    console.error('Slack alert failed:', error.message);
    return false;
  }
}

async function sendDiscordAlert(webhookUrl, monitorName, monitorUrl, message) {
  try {
    const got = require('got');
    const payload = {
      embeds: [{
        title: `🚨 ${monitorName} is DOWN`,
        color: 0xdc2626,
        fields: [
          { name: 'URL', value: monitorUrl, inline: true },
          { name: 'Error', value: message, inline: true },
          { name: 'Time', value: new Date().toISOString(), inline: false },
        ],
      }],
    };
    await got.post(webhookUrl, { json: payload });
    console.log('🎮 Discord alert sent');
    return true;
  } catch (error) {
    console.error('Discord alert failed:', error.message);
    return false;
  }
}

async function sendSMSAlert(phoneNumber, monitorName, monitorUrl, message) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('⚠️ Twilio not configured — skipping SMS');
      return false;
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `🚨 PulseOps Alert: ${monitorName} (${monitorUrl}) is DOWN. ${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log(`📱 SMS sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('SMS send failed:', error.message);
    return false;
  }
}

async function dispatchAlerts(monitorId, failureCount, errorMessage) {
  try {
    const monitorResult = await pool.query(
      'SELECT id, name, url, user_id FROM monitors WHERE id = $1',
      [monitorId]
    );
    if (monitorResult.rows.length === 0) return;
    const monitor = monitorResult.rows[0];

    const rulesResult = await pool.query(
      'SELECT * FROM alert_rules WHERE monitor_id = $1 AND is_active = true ORDER BY trigger_level ASC',
      [monitorId]
    );

    const now = new Date();

    for (const rule of rulesResult.rows) {
      if (failureCount < rule.trigger_level) continue;

      if (rule.last_alerted_at) {
        const lastAlert = new Date(rule.last_alerted_at);
        const minutesSinceLastAlert = (now - lastAlert) / (1000 * 60);
        if (minutesSinceLastAlert < rule.cooldown_minutes) {
          console.log(`⏳ Alert suppressed for ${monitor.name} — cooldown active`);
          continue;
        }
      }

      const onCallResult = await pool.query(
        `SELECT u.email, u.name FROM oncall_schedules os
         JOIN users u ON u.id = os.user_id
         WHERE os.monitor_id = $1 AND NOW() BETWEEN os.start_time AND os.end_time
         LIMIT 1`,
        [monitorId]
      );
      const onCallPerson = onCallResult.rows[0];

      let sent = false;

      switch (rule.channel) {
        case 'email':
          const emailTarget = onCallPerson ? onCallPerson.email : rule.destination;
          sent = await sendEmailAlert(emailTarget, monitor.name, monitor.url, errorMessage);
          break;
        case 'slack':
          sent = await sendSlackAlert(rule.destination, monitor.name, monitor.url, errorMessage, failureCount);
          break;
        case 'discord':
          sent = await sendDiscordAlert(rule.destination, monitor.name, monitor.url, errorMessage);
          break;
        case 'sms':
          sent = await sendSMSAlert(rule.destination, monitor.name, monitor.url, errorMessage);
          break;
      }

      if (sent) {
        await pool.query('UPDATE alert_rules SET last_alerted_at = NOW() WHERE id = $1', [rule.id]);
      }
    }
  } catch (error) {
    console.error('dispatchAlerts error:', error);
  }
}

async function sendResolutionAlert(monitorId) {
  try {
    const monitorResult = await pool.query('SELECT name, url FROM monitors WHERE id = $1', [monitorId]);
    if (monitorResult.rows.length === 0) return;
    const monitor = monitorResult.rows[0];

    const rulesResult = await pool.query(
      "SELECT * FROM alert_rules WHERE monitor_id = $1 AND is_active = true AND channel = 'email'",
      [monitorId]
    );

    for (const rule of rulesResult.rows) {
      await sendEmailAlert(rule.destination, monitor.name, monitor.url, '✅ Monitor is back UP');
    }
    console.log(`✅ Resolution alerts sent for ${monitor.name}`);
  } catch (error) {
    console.error('sendResolutionAlert error:', error);
  }
}

module.exports = { dispatchAlerts, sendResolutionAlert };
