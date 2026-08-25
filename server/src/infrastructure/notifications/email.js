const nodemailer = require('nodemailer');
const { env } = require('../../config/env');

function createTransport() {
  if (!env.smtp.host || !env.smtp.user) return null;
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
}

const transport = createTransport();

async function sendEmail({ to, subject, text, html }) {
  if (!transport) {
    console.warn('[mail] SMTP not configured. Skipping email to', to);
    return { skipped: true };
  }
  await transport.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html: html || `<pre style="font-family:inherit">${text}</pre>`,
  });
  return { skipped: false };
}

module.exports = { sendEmail };
