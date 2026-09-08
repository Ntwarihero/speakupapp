const { v4: uuid } = require('uuid');
const { query } = require('../database/pool');
const { env } = require('../../config/env');
const { ALERT_SEVERITIES } = require('../../shared/constants');
const { sendEmail, wrapHtml } = require('./email');
const { sendWhatsApp, formatAlert } = require('./whatsapp');
const AuthService = require('../../application/services/AuthService');

function publicAppUrl() {
  const raw = String(env.appUrl || '').replace(/\/$/, '');
  if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) {
    if (env.nodeEnv === 'production' || process.env.VERCEL) {
      return 'https://speakupapp.vercel.app';
    }
  }
  return raw || 'http://localhost:5173';
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function reviewUrlFor(to, report) {
  const base = publicAppUrl();
  const next = `/app/reports/${report.id}`;
  const staff = await AuthService.findStaffByEmail(to);
  if (!staff) {
    return `${base}/login?next=${encodeURIComponent(next)}`;
  }
  const token = AuthService.createAlertLink({ user: staff, reportId: report.id });
  return `${base}/alert?t=${encodeURIComponent(token)}`;
}

function alertHtml({ report, locationName, severity, reviewUrl }) {
  const reportNo = esc(report.report_no);
  return wrapHtml('SAFETY ALERT', `
      <p style="margin:0 0 12px">A <strong>${esc(severity)}</strong> hazard was reported at <strong>${esc(locationName)}</strong>.</p>
      <p style="margin:0 0 16px;font-size:16px">
        Report No:
        <a href="${reviewUrl}" style="color:#5c2d91;font-weight:700;text-decoration:underline">${reportNo}</a>
      </p>
      <p style="margin:0 0 20px;white-space:pre-wrap">${esc(report.description)}</p>
      <p style="margin:0 0 16px">
        <a href="${reviewUrl}" style="display:inline-block;background:#5c2d91;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
          Open ${reportNo} in SpeakUp
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#6b7280">Click the report number to sign in and follow up. This link is for you only and expires in 7 days.</p>
    `);
}

async function logNotification({ reportId, channel, recipient, subject, body, status, error }) {
  await query(
    `INSERT INTO notification_log (id, report_id, channel, recipient, subject, body, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), reportId, channel, recipient, subject, body, status, error || null]
  );
}

async function notifyHighSeverity(report, locationName) {
  if (!ALERT_SEVERITIES.includes(report.severity)) return;

  const severity = String(report.severity).toUpperCase();
  const subject = `SAFETY ALERT ${report.report_no} — ${severity} — ${locationName}`;
  const emails = [env.alerts.safetyManager, env.alerts.operationsManager, env.alerts.securityTeam];
  const phones = [env.whatsapp.safetyManager, env.whatsapp.operationsManager, env.whatsapp.security];

  for (const to of emails.filter(Boolean)) {
    const reviewUrl = await reviewUrlFor(to, report);
    const text = formatAlert({
      reportNo: report.report_no,
      location: locationName,
      severity,
      description: report.description,
      reviewUrl,
    });
    const html = alertHtml({ report, locationName, severity, reviewUrl });
    try {
      const result = await sendEmail({ to, subject, text, html });
      await logNotification({
        reportId: report.id,
        channel: 'email',
        recipient: to,
        subject,
        body: text,
        status: result.skipped ? 'queued' : 'sent',
      });
    } catch (err) {
      await logNotification({
        reportId: report.id,
        channel: 'email',
        recipient: to,
        subject,
        body: text,
        status: 'failed',
        error: err.message,
      });
    }
  }

  for (const to of phones.filter(Boolean)) {
    const reviewUrl = await reviewUrlFor(to, report);
    const body = formatAlert({
      reportNo: report.report_no,
      location: locationName,
      severity,
      description: report.description,
      reviewUrl,
    });
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
