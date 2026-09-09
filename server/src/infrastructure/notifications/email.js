const nodemailer = require('nodemailer');
const { env } = require('../../config/env');

function getTransport() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    requireTLS: !env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || '').trim();
  if (!recipient) {
    console.warn('[mail] skipped: empty recipient');
    return { skipped: true };
  }
  const transport = getTransport();
  if (!transport) {
    console.warn('[mail] SMTP not configured. Skipping email to', recipient);
    return { skipped: true };
  }
  await transport.sendMail({
    from: env.smtp.from,
    to: recipient,
    subject,
    text,
    html: html || `<pre style="font-family:inherit">${text}</pre>`,
  });
  console.log('[mail] sent', subject, 'to', recipient);
  return { skipped: false };
}

function wrapHtml(title, inner) {
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e1233">
      <div style="height:8px;background:repeating-linear-gradient(90deg,#c9a84c 0 12px,#1e1233 12px 24px)"></div>
      <h1 style="color:#5c2d91;font-size:20px;margin:20px 0 8px">SpeakUp</h1>
      <p style="margin:0 0 16px;color:#6b7280;font-size:13px">DP World Kigali · HSSE</p>
      <h2 style="font-size:18px;margin:0 0 12px">${title}</h2>
      ${inner}
      <p style="margin-top:24px;font-size:12px;color:#9ca3af">Do not share this email. If you did not expect it, contact HSSE.</p>
    </div>
  `;
}

module.exports = { sendEmail, wrapHtml };
