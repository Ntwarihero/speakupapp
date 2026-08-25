const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/AuthController');
const ReportController = require('../controllers/ReportController');
const OpsController = require('../controllers/OpsController');
const { requireAuth, requireRoles, optionalAuth } = require('../middleware/auth');
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
  api.post('/auth/refresh', AuthController.refresh);
  api.post('/auth/logout', optionalAuth, AuthController.logout);
  api.get('/auth/me', requireAuth, AuthController.me);

  api.post(
    '/reports',
    reportLimiter,
    optionalAuth,
    upload.array('images', 6),
    ReportController.createRules,
    ReportController.create
  );
  api.get('/reports', requireAuth, ReportController.list);
  api.get('/reports/:id', requireAuth, ReportController.getOne);
  api.patch('/reports/:id/status', requireAuth, requireRoles(...officer), ReportController.status);
  api.patch('/reports/:id/assign', requireAuth, requireRoles(...officer), ReportController.assign);

  api.get('/reports/:reportId/investigation', requireAuth, requireRoles(...officer), OpsController.getInvestigation);
  api.put('/reports/:reportId/investigation', requireAuth, requireRoles(...officer), OpsController.saveInvestigation);
  api.post(
    '/reports/:reportId/investigation/approve',
    requireAuth,
    requireRoles(...manager),
    OpsController.approveInvestigation
  );

  api.get('/actions', requireAuth, requireRoles(...officer), OpsController.listActions);
  api.post('/actions', requireAuth, requireRoles(...officer), OpsController.createAction);
  api.patch('/actions/:id', requireAuth, requireRoles(...officer), OpsController.updateAction);

  api.get('/analytics', requireAuth, requireRoles(...officer), OpsController.analytics);

  api.get('/admin/users', requireAuth, requireRoles(...admin), AuthController.listUsers);
  api.post('/admin/users', requireAuth, requireRoles(...admin), AuthController.createUser);
  api.patch('/admin/users/:id', requireAuth, requireRoles(...admin), AuthController.updateUser);

  api.get('/admin/locations', requireAuth, requireRoles(...admin), OpsController.locations);
  api.post('/admin/locations', requireAuth, requireRoles(...admin), OpsController.locations);
  api.patch('/admin/locations/:id', requireAuth, requireRoles(...admin), OpsController.locations);

  api.get('/admin/categories', requireAuth, requireRoles(...admin), OpsController.categories);
  api.post('/admin/categories', requireAuth, requireRoles(...admin), OpsController.categories);
  api.patch('/admin/categories/:id', requireAuth, requireRoles(...admin), OpsController.categories);

  api.post('/admin/announcements', requireAuth, requireRoles(...manager), OpsController.announcements);
  api.post('/admin/training', requireAuth, requireRoles(...manager), OpsController.training);
  api.get('/admin/audit', requireAuth, requireRoles(...admin), OpsController.audit);
  api.get('/admin/settings', requireAuth, requireRoles(...admin), OpsController.settings);
  api.put('/admin/settings', requireAuth, requireRoles(...admin), OpsController.settings);

  return api;
}

module.exports = { buildRouter };
