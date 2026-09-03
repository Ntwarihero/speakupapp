const { v4: uuid } = require('uuid');
const { query } = require('../../infrastructure/database/pool');
const { NotFoundError } = require('../../shared/errors');

async function listLocations() {
  return query('SELECT * FROM locations ORDER BY sort_order, name');
}

async function upsertLocation(id, data) {
  if (id) {
    await query(
      `UPDATE locations SET code=?, name=?, qr_slug=?, latitude=?, longitude=?, is_active=?, sort_order=? WHERE id=?`,
      [data.code, data.name, data.qrSlug, data.latitude, data.longitude, data.isActive ? 1 : 0, data.sortOrder || 0, id]
    );
    return id;
  }
  const newId = uuid();
  await query(
    `INSERT INTO locations (id, code, name, qr_slug, latitude, longitude, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, data.code, data.name, data.qrSlug, data.latitude, data.longitude, 1, data.sortOrder || 0]
  );
  return newId;
}

async function listCategories() {
  return query('SELECT * FROM report_categories ORDER BY sort_order, name');
}

async function upsertCategory(id, data) {
  if (id) {
    await query(
      `UPDATE report_categories SET code=?, name=?, module=?, is_active=?, sort_order=? WHERE id=?`,
      [data.code, data.name, data.module, data.isActive ? 1 : 0, data.sortOrder || 0, id]
    );
    return id;
  }
  const newId = uuid();
  await query(
    `INSERT INTO report_categories (id, code, name, module, is_active, sort_order) VALUES (?, ?, ?, ?, 1, ?)`,
    [newId, data.code, data.name, data.module || 'general', data.sortOrder || 0]
  );
  return newId;
}

async function listAnnouncements() {
  return query(
    `SELECT a.*, u.full_name AS author FROM announcements a LEFT JOIN users u ON u.id = a.created_by ORDER BY a.created_at DESC`
  );
}

async function createAnnouncement(data, actor) {
  const id = uuid();
  await query(`INSERT INTO announcements (id, title, body, is_published, created_by) VALUES (?, ?, ?, 1, ?)`, [
    id,
    data.title,
    data.body,
    actor.id,
  ]);
  return id;
}

async function listTraining() {
  return query('SELECT * FROM training_materials WHERE is_published = 1 ORDER BY created_at DESC');
}

async function createTraining(data) {
  const id = uuid();
  await query(
    `INSERT INTO training_materials (id, title, description, url, category) VALUES (?, ?, ?, ?, ?)`,
    [id, data.title, data.description || null, data.url || null, data.category || null]
  );
  return id;
}

async function listAudit({ limit = 200 } = {}) {
  return query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [Number(limit)]);
}

async function getSettings() {
  const rows = await query('SELECT setting_key, setting_value FROM system_settings');
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
}

async function updateSettings(entries, actor) {
  for (const [key, value] of Object.entries(entries)) {
    await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
      [key, String(value), actor.id]
    );
  }
  return getSettings();
}

async function listActiveLocations() {
  const rows = await query(
    'SELECT id, code, name, qr_slug, latitude, longitude FROM locations WHERE is_active = 1 ORDER BY sort_order, name'
  );
  return Array.isArray(rows) ? rows : [];
}

async function lookups() {
  const [locations, categories, officers] = await Promise.all([
    listActiveLocations(),
    query('SELECT id, code, name, module FROM report_categories WHERE is_active = 1 ORDER BY sort_order').catch((err) => {
      console.error('lookups categories', err.message);
      return [];
    }),
    query(
      `SELECT id, full_name, department, role FROM users
       WHERE is_active = 1 AND role IN (?, ?, ?)
       ORDER BY full_name`,
      ['safety_officer', 'safety_manager', 'employee']
    ).catch((err) => {
      console.error('lookups officers', err.message);
      return [];
    }),
  ]);
  return {
    locations,
    categories: Array.isArray(categories) ? categories : [],
    officers: Array.isArray(officers) ? officers : [],
  };
}

async function requireLocation(id) {
  const rows = await query('SELECT * FROM locations WHERE id = ?', [id]);
  if (!rows[0]) throw new NotFoundError('Location not found');
  return rows[0];
}

module.exports = {
  listLocations,
  listActiveLocations,
  upsertLocation,
  listCategories,
  upsertCategory,
  listAnnouncements,
  createAnnouncement,
  listTraining,
  createTraining,
  listAudit,
  getSettings,
  updateSettings,
  lookups,
  requireLocation,
};
