const { env } = require('../../config/env');
const { AppError } = require('../../shared/errors');
const { sendEmail, wrapHtml } = require('./email');

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loginUrl() {
  return `${env.appUrl.replace(/\/$/, '')}/login`;
}

async function sendWelcomeCredentials({ to, fullName, username, password }) {
  const subject = 'Your SpeakUp account — DP World Kigali';
  const text = [
    `Hello ${fullName},`,
    '',
    'A SpeakUp account was created for you.',
    `Username: ${username}`,
    `Temporary password: ${password}`,
    '',
    `Sign in at: ${loginUrl()}`,
    'You will receive a one-time verification code (OTP) by email, then you must set a new password.',
  ].join('\n');
  const html = wrapHtml('Your SpeakUp account', `
    <p>Hello ${esc(fullName)},</p>
    <p>A SpeakUp account was created for you. Use these details once, then set your own password.</p>
    <p><strong>Username:</strong> ${esc(username)}<br/>
    <strong>Temporary password:</strong> ${esc(password)}</p>
    <p><a href="${loginUrl()}" style="display:inline-block;background:#5c2d91;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Sign in to SpeakUp</a></p>
    <p>After sign-in you will receive a 6-digit OTP by email. Then you must create a new password.</p>
  `);
  const result = await sendEmail({ to, subject, text, html });
  if (result.skipped) {
    throw new AppError('Email is not configured. Account was not created.', 503, 'SMTP_NOT_CONFIGURED');
  }
}

async function sendLoginOtp({ to, fullName, otp }) {
  const subject = 'SpeakUp login code';
  const text = [
    `Hello ${fullName},`,
    '',
    `Your SpeakUp verification code is: ${otp}`,
    'This code expires in 10 minutes. Do not share it.',
  ].join('\n');
  const html = wrapHtml('Login verification code', `
    <p>Hello ${esc(fullName)},</p>
    <p>Use this code to finish signing in to SpeakUp. It expires in <strong>10 minutes</strong>.</p>
    <p style="font-size:28px;letter-spacing:8px;font-weight:700;color:#5c2d91;margin:16px 0">${esc(otp)}</p>
  `);
  const result = await sendEmail({ to, subject, text, html });
  if (result.skipped) {
    throw new AppError('Email is not configured. Cannot send the login code.', 503, 'SMTP_NOT_CONFIGURED');
  }
}

module.exports = { sendWelcomeCredentials, sendLoginOtp };
