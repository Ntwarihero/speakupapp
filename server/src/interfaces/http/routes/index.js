const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/AuthController');
const ReportController = require('../controllers/ReportController');
const OpsController = require('../controllers/OpsController');
const { requireAuth, requireRoles, optionalAuth, requirePasswordSet } = require('../middleware/auth');
const { upload } = require('../../../infrastructure/storage/uploader');
const { ROLES } = require('../../../shared/constants');

const officer = [ROLES.SAFETY_OFFICER, ROLES.SAFETY_MANAGER, ROLES.ADMINISTRATOR];
const manager = [ROLES.SAFETY_MANAGER, ROLES.ADMINISTRATOR];
const admin = [ROLES.ADMINISTRATOR];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Try again later.', code: 'RATE_LIMIT' } },
});

const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function buildRouter() {
  const api = Router();

  api.get('/health', OpsController.health);
  api.get('/lookups', OpsController.lookups);
  api.get('/files/:filename', OpsController.file);
  api.get('/track/:reportNo', ReportController.track);
  api.get('/announcements', OpsController.announcements);
  api.get('/training', OpsController.training);

  api.post('/auth/login', loginLimiter, AuthController.loginRules, AuthController.login);
  api.post('/auth/verify-otp', loginLimiter, AuthController.otpRules, AuthController.verifyOtp);
  api.post('/auth/resend-otp', loginLimiter, AuthController.resendOtp);
  api.post('/auth/forgot-password', loginLimiter, AuthController.forgotRules, AuthController.forgotPassword);
  api.post('/auth/reset-password', loginLimiter, AuthController.resetRules, AuthController.resetPassword);
  api.post('/auth/refresh', AuthController.refresh);
  api.post('/auth/logout', optionalAuth, AuthController.logout);
  api.get('/auth/me', requireAuth, AuthController.me);
  api.post(
    '/auth/change-password',
    requireAuth,
    AuthController.changePasswordRules,
    AuthController.changePassword
  );

  const authed = [requireAuth, requirePasswordSet];

  api.post(
    '/reports',
    reportLimiter,
    optionalAuth,
    upload.array('images', 6),
    ReportController.createRules,
    ReportController.create
  );
  api.get('/reports', ...authed, ReportController.list);
  api.get('/reports/:id', ...authed, ReportController.getOne);
  api.patch('/reports/:id/status', ...authed, requireRoles(...officer), ReportController.status);
  api.patch('/reports/:id/assign', ...authed, requireRoles(...officer), ReportController.assign);

  api.get('/reports/:reportId/investigation', ...authed, requireRoles(...officer), OpsController.getInvestigation);
  api.put('/reports/:reportId/investigation', ...authed, requireRoles(...officer), OpsController.saveInvestigation);
  api.post(
    '/reports/:reportId/investigation/approve',
    ...authed,
    requireRoles(...manager),
    OpsController.approveInvestigation
  );

  api.get('/actions', ...authed, requireRoles(...officer), OpsController.listActions);
  api.post('/actions', ...authed, requireRoles(...officer), OpsController.createAction);
  api.patch('/actions/:id', ...authed, requireRoles(...officer), OpsController.updateAction);

  api.get('/analytics', ...authed, requireRoles(...officer), OpsController.analytics);

  api.get('/admin/users', ...authed, requireRoles(...admin), AuthController.listUsers);
  api.post('/admin/users', ...authed, requireRoles(...admin), AuthController.createUser);
  api.patch('/admin/users/:id', ...authed, requireRoles(...admin), AuthController.updateUser);

  api.get('/admin/locations', ...authed, requireRoles(...admin), OpsController.locations);
  api.post('/admin/locations', ...authed, requireRoles(...admin), OpsController.locations);
  api.patch('/admin/locations/:id', ...authed, requireRoles(...admin), OpsController.locations);

  api.get('/admin/categories', ...authed, requireRoles(...admin), OpsController.categories);
  api.post('/admin/categories', ...authed, requireRoles(...admin), OpsController.categories);
  api.patch('/admin/categories/:id', ...authed, requireRoles(...admin), OpsController.categories);

  api.post('/admin/announcements', ...authed, requireRoles(...manager), OpsController.announcements);
  api.post('/admin/training', ...authed, requireRoles(...manager), OpsController.training);
  api.get('/admin/audit', ...authed, requireRoles(...admin), OpsController.audit);
  api.get('/admin/settings', ...authed, requireRoles(...admin), OpsController.settings);
  api.put('/admin/settings', ...authed, requireRoles(...admin), OpsController.settings);

  return api;
}

module.exports = { buildRouter };
