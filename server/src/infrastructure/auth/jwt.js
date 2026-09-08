const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');
const { UnauthorizedError } = require('../../shared/errors');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
}

function verifyAccess(token) {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw new UnauthorizedError('Access token is invalid or expired');
  }
}

function verifyRefresh(token) {
  try {
    return jwt.verify(token, env.jwt.refreshSecret);
  } catch {
    throw new UnauthorizedError('Refresh token is invalid or expired');
  }
}

function signAlertLink(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: '7d' });
}

function verifyAlertLink(token) {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw new UnauthorizedError('This alert link is invalid or has expired');
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
  signAlertLink,
  verifyAlertLink,
};
