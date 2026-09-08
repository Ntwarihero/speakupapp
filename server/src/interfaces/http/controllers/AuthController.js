const AuthService = require('../../../application/services/AuthService');
const { writeAudit } = require('../../../infrastructure/database/audit');
const { body } = require('express-validator');
const { validate } = require('../middleware/error');

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const otpRules = [
  body('challengeId').trim().notEmpty().withMessage('Verification session is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code'),
  validate,
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
];

const forgotRules = [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  validate,
];

const resetRules = [
  body('challengeId').trim().notEmpty().withMessage('Reset session is required'),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('Enter the 6-digit code'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
];

const alertSsoRules = [
  body('token').trim().notEmpty().withMessage('Alert link is required'),
  validate,
];

async function login(req, res, next) {
  try {
    const result = await AuthService.login({
      username: req.body.username,
      password: req.body.password,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const result = await AuthService.verifyOtp({
      challengeId: req.body.challengeId,
      otp: req.body.otp,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    req.user = result.user;
    try {
      await writeAudit(req, { action: 'login', entity: 'user', entityId: result.user.id });
    } catch (auditErr) {
      console.warn('login audit skipped', auditErr.message);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function resendOtp(req, res, next) {
  try {
    const result = await AuthService.resendOtp({ challengeId: req.body.challengeId });
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

async function changePassword(req, res, next) {
  try {
    const user = await AuthService.changePassword(req.user, {
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    await writeAudit(req, { action: 'change_password', entity: 'user', entityId: user.id });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await AuthService.requestPasswordReset({ username: req.body.username });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await AuthService.resetPassword({
      challengeId: req.body.challengeId,
      otp: req.body.otp,
      newPassword: req.body.newPassword,
    });
    try {
      await writeAudit(req, { action: 'reset_password', entity: 'user' });
    } catch (auditErr) {
      console.warn('reset audit skipped', auditErr.message);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function alertSso(req, res, next) {
  try {
    const result = await AuthService.consumeAlertLink({
      token: req.body.token,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    req.user = result.user;
    try {
      await writeAudit(req, {
        action: 'alert_sso',
        entity: 'report',
        entityId: result.reportId,
      });
    } catch (auditErr) {
      console.warn('alert sso audit skipped', auditErr.message);
    }
    res.json(result);
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
    res.status(201).json({ user, emailed: true });
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

module.exports = {
  login,
  verifyOtp,
  resendOtp,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  alertSso,
  me,
  listUsers,
  createUser,
  updateUser,
  loginRules,
  otpRules,
  changePasswordRules,
  forgotRules,
  resetRules,
  alertSsoRules,
};
