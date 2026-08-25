const { v4: uuid } = require('uuid');
const { query } = require('../database/pool');
const { env } = require('../../config/env');
const { ALERT_SEVERITIES } = require('../../shared/constants');
const { sendEmail } = require('./email');
const { sendWhatsApp, formatAlert } = require('./whatsapp');

async function logNotification({ reportId, channel, recipient, subject, body, status, error }) {
  await query(
    `INSERT INTO notification_log (id, report_id, channel, recipient, subject, body, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), reportId, channel, recipient, subject, body, status, error || null]
  );
}

async function notifyHighSeverity(report, locationName) {
  if (!ALERT_SEVERITIES.includes(report.severity)) return;

  const body = formatAlert({
    reportNo: report.report_no,
    location: locationName,
    severity: String(report.severity).toUpperCase(),
    description: report.description,
  });
  const subject = `SAFETY ALERT ${report.report_no} — ${String(report.severity).toUpperCase()} — ${locationName}`;
  const emails = [env.alerts.safetyManager, env.alerts.operationsManager, env.alerts.securityTeam];
  const phones = [env.whatsapp.safetyManager, env.whatsapp.operationsManager, env.whatsapp.security];

  for (const to of emails) {
    try {
      const result = await sendEmail({ to, subject, text: body });
      await logNotification({
        reportId: report.id,
        channel: 'email',
        recipient: to,
        subject,
        body,
        status: result.skipped ? 'queued' : 'sent',
      });
    } catch (err) {
      await logNotification({
        reportId: report.id,
        channel: 'email',
        recipient: to,
        subject,
        body,
        status: 'failed',
        error: err.message,
      });
    }
  }

  for (const to of phones.filter(Boolean)) {
    try {
      const result = await sendWhatsApp({ to, body });
      await logNotification({
        reportId: report.id,
        channel: 'whatsapp',
        recipient: to,
        subject,
        body,
        status: result.skipped ? 'queued' : 'sent',
      });
    } catch (err) {
      await logNotification({
        reportId: report.id,
        channel: 'whatsapp',
        recipient: to,
        subject,
        body,
        status: 'failed',
        error: err.message,
      });
    }
  }
}

module.exports = { notifyHighSeverity, logNotification };
