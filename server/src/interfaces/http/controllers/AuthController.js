const AuthService = require('../../../application/services/AuthService');
const { writeAudit } = require('../../../infrastructure/database/audit');
const { body } = require('express-validator');
const { validate } = require('../middleware/error');

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

async function login(req, res, next) {
  try {
    const result = await AuthService.login({
      username: req.body.username,
      password: req.body.password,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    await writeAudit(req, { action: 'login', entity: 'user', entityId: result.user.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await AuthService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await AuthService.logout(req.body.refreshToken);
    await writeAudit(req, { action: 'logout', entity: 'user', entityId: req.user?.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

async function listUsers(req, res, next) {
  try {
    res.json({ users: await AuthService.listUsers() });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await AuthService.createUser(req.user, req.body);
    await writeAudit(req, { action: 'create_user', entity: 'user', entityId: user.id, metadata: { username: user.username } });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await AuthService.updateUser(req.params.id, req.body);
    await writeAudit(req, { action: 'update_user', entity: 'user', entityId: user.id });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout, me, listUsers, createUser, updateUser, loginRules };
