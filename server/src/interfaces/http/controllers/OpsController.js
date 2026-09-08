const InvestigationService = require('../../../application/services/InvestigationService');
const AnalyticsService = require('../../../application/services/AnalyticsService');
const AdminService = require('../../../application/services/AdminService');
const AuthService = require('../../../application/services/AuthService');
const { writeAudit } = require('../../../infrastructure/database/audit');
const { query } = require('../../../infrastructure/database/pool');
const { env } = require('../../../config/env');
const { SITE_LOCATIONS } = require('../../../shared/siteLocations');
const path = require('path');

async function getInvestigation(req, res, next) {
  try {
    res.json({ investigation: await InvestigationService.getInvestigation(req.params.reportId) });
  } catch (err) {
    next(err);
  }
}

async function saveInvestigation(req, res, next) {
  try {
    const investigation = await InvestigationService.upsertInvestigation(req.params.reportId, req.body, req.user);
    await writeAudit(req, { action: 'save_investigation', entity: 'investigation', entityId: req.params.reportId });
    res.json({ investigation });
  } catch (err) {
    next(err);
  }
}

async function approveInvestigation(req, res, next) {
  try {
    const investigation = await InvestigationService.approveInvestigation(
      req.params.reportId,
      req.user,
      req.body.approved !== false
    );
    await writeAudit(req, { action: 'approve_investigation', entity: 'investigation', entityId: req.params.reportId });
    res.json({ investigation });
  } catch (err) {
    next(err);
  }
}

async function listActions(req, res, next) {
  try {
    res.json({ actions: await InvestigationService.listActions(req.query) });
  } catch (err) {
    next(err);
  }
}

async function createAction(req, res, next) {
  try {
    const action = await InvestigationService.createAction(req.body);
    await writeAudit(req, { action: 'create_action', entity: 'corrective_action', entityId: action.id });
    res.status(201).json({ action });
  } catch (err) {
    next(err);
  }
}

async function updateAction(req, res, next) {
  try {
    const action = await InvestigationService.updateAction(req.params.id, req.body);
    await writeAudit(req, { action: 'update_action', entity: 'corrective_action', entityId: req.params.id });
    res.json({ action });
  } catch (err) {
    next(err);
  }
}

async function analytics(req, res, next) {
  try {
    res.json(await AnalyticsService.kpis());
  } catch (err) {
    next(err);
  }
}

async function publicLocations(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const locations = await Promise.race([
      AdminService.listActiveLocations(),
      new Promise((resolve) => setTimeout(() => resolve(null), 800)),
    ]);
    res.json({ locations: Array.isArray(locations) && locations.length ? locations : SITE_LOCATIONS });
  } catch {
    res.json({ locations: SITE_LOCATIONS });
  }
}

function clientReset(_req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>SpeakUp refresh</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#1e1233">
  <p>Refreshing SpeakUp…</p>
  <script>
    Promise.all([
      navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
      }) : Promise.resolve(),
      window.caches ? caches.keys().then(function (names) {
        return Promise.all(names.map(function (name) { return caches.delete(name); }));
      }) : Promise.resolve()
    ]).finally(function () {
      try { localStorage.removeItem('speakup-flush-sw-20260908-locations'); } catch (e) {}
      location.replace('/report?module=general');
    });
  </script>
</body>
</html>`);
}

async function lookups(_req, res, next) {
  try {
    res.json(await AdminService.lookups());
  } catch (err) {
    next(err);
  }
}

async function locations(req, res, next) {
  try {
    if (req.method === 'GET') return res.json({ locations: await AdminService.listLocations() });
    const id = await AdminService.upsertLocation(req.params.id, req.body);
    await writeAudit(req, { action: 'upsert_location', entity: 'location', entityId: id });
    res.json({ id });
  } catch (err) {
    next(err);
  }
}

async function categories(req, res, next) {
  try {
    if (req.method === 'GET') return res.json({ categories: await AdminService.listCategories() });
    const id = await AdminService.upsertCategory(req.params.id, req.body);
    await writeAudit(req, { action: 'upsert_category', entity: 'category', entityId: id });
    res.json({ id });
  } catch (err) {
    next(err);
  }
}

async function announcements(req, res, next) {
  try {
    if (req.method === 'GET') return res.json({ announcements: await AdminService.listAnnouncements() });
    const id = await AdminService.createAnnouncement(req.body, req.user);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
}

async function training(req, res, next) {
  try {
    if (req.method === 'GET') return res.json({ materials: await AdminService.listTraining() });
    const id = await AdminService.createTraining(req.body);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
}

async function audit(req, res, next) {
  try {
    res.json({ logs: await AdminService.listAudit(req.query) });
  } catch (err) {
    next(err);
  }
}

async function settings(req, res, next) {
  try {
    if (req.method === 'GET') return res.json({ settings: await AdminService.getSettings() });
    res.json({ settings: await AdminService.updateSettings(req.body, req.user) });
  } catch (err) {
    next(err);
  }
}

async function file(req, res, next) {
  try {
    const filename = path.basename(req.params.filename);
    const rows = await query(
      'SELECT file_name, mime_type, file_data, storage_path FROM report_images WHERE storage_path = ? LIMIT 1',
      [filename]
    );
    if (rows[0]?.file_data) {
      res.setHeader('Content-Type', rows[0].mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${rows[0].file_name || filename}"`);
      return res.send(rows[0].file_data);
    }
    const filePath = path.join(env.uploads.dir, filename);
    res.sendFile(filePath, (err) => (err ? next(err) : undefined));
  } catch (err) {
    next(err);
  }
}

async function health(_req, res) {
  res.json({ ok: true, service: 'speakup-api', time: new Date().toISOString() });
}

module.exports = {
  getInvestigation,
  saveInvestigation,
  approveInvestigation,
  listActions,
  createAction,
  updateAction,
  analytics,
  lookups,
  publicLocations,
  locations,
  categories,
  announcements,
  training,
  audit,
  settings,
  file,
  health,
  clientReset,
  AuthService,
};
