const { v4: uuid } = require('uuid');
const { query, withTransaction } = require('../../infrastructure/database/pool');
const { notifyHighSeverity } = require('../../infrastructure/notifications/alerts');
const { AppError, NotFoundError, ForbiddenError } = require('../../shared/errors');
const { STATUS_TRANSITIONS, REPORT_STATUSES, PUBLIC_CATEGORIES, ROLES } = require('../../shared/constants');

function mapReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportNo: row.report_no,
    reporterCategory: row.reporter_category,
    isAnonymous: Boolean(row.is_anonymous),
    reporterName: row.reporter_name,
    company: row.company,
    phone: row.phone,
    email: row.email,
    vehicleRegistration: row.vehicle_registration,
    reporterUserId: row.reporter_user_id,
    reportType: row.report_type,
    module: row.module,
    severity: row.severity,
    locationId: row.location_id,
    locationName: row.location_name,
    locationCode: row.location_code,
    locationOther: row.location_other,
    description: row.description,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedName: row.assigned_name || null,
    assignedDepartment: row.assigned_department,
    occurredAt: row.occurred_at,
    closedAt: row.closed_at,
    firstResponseAt: row.first_response_at,
    extraFields: typeof row.extra_fields === 'string' ? JSON.parse(row.extra_fields) : row.extra_fields,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: row.images || undefined,
    history: row.history || undefined,
  };
}

const SELECT = `
  SELECT r.*, l.name AS location_name, l.code AS location_code, u.full_name AS assigned_name
  FROM reports r
  JOIN locations l ON l.id = r.location_id
  LEFT JOIN users u ON u.id = r.assigned_to
`;

async function nextReportNo(conn) {
  const year = new Date().getFullYear();
  await conn.query(
    'INSERT INTO report_sequences (year_key, last_number) VALUES (?, 0) ON DUPLICATE KEY UPDATE year_key = year_key',
    [year]
  );
  const [rows] = await conn.query(
    'SELECT last_number FROM report_sequences WHERE year_key = ? FOR UPDATE',
    [year]
  );
  const next = (rows[0]?.last_number || 0) + 1;
  await conn.query('UPDATE report_sequences SET last_number = ? WHERE year_key = ?', [next, year]);
  return `SAF-${year}-${String(next).padStart(6, '0')}`;
}

async function attachImages(reportId, files) {
  if (!files?.length) return;
  for (const file of files) {
    const storagePath = file.filename || `${uuid()}.bin`;
    await query(
      `INSERT INTO report_images (id, report_id, file_name, mime_type, file_size, storage_path, file_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), reportId, file.originalname, file.mimetype, file.size, storagePath, file.buffer || null]
    );
  }
}

async function loadImages(reportId) {
  return query(
    'SELECT id, file_name, mime_type, file_size, storage_path, created_at FROM report_images WHERE report_id = ?',
    [reportId]
  );
}

async function loadHistory(reportId) {
  return query(
    `SELECT h.*, u.full_name AS changed_by_name
     FROM report_status_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.report_id = ?
     ORDER BY h.created_at ASC`,
    [reportId]
  );
}

function toCoord(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function createReport(payload, files, actor) {
  if (PUBLIC_CATEGORIES.includes(payload.reporterCategory) && actor) {
    /* public users may still be logged in later; allow */
  }
  const locations = await query('SELECT id, latitude, longitude FROM locations WHERE id = ?', [payload.locationId]);
  if (!locations[0]) throw new NotFoundError('Location not found');
  const latitude = toCoord(payload.latitude) ?? toCoord(locations[0].latitude);
  const longitude = toCoord(payload.longitude) ?? toCoord(locations[0].longitude);
  const report = await withTransaction(async (conn) => {
    const id = uuid();
    const reportNo = await nextReportNo(conn);
    const extra = payload.extraFields ? JSON.stringify(payload.extraFields) : null;
    await conn.query(
      `INSERT INTO reports (
        id, report_no, reporter_category, is_anonymous, reporter_name, company, phone, email,
        vehicle_registration, reporter_user_id, report_type, module, severity, location_id,
        location_other, description, latitude, longitude, status, occurred_at, extra_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      [
        id,
        reportNo,
        payload.reporterCategory,
        payload.isAnonymous ? 1 : 0,
        payload.isAnonymous ? null : payload.reporterName || null,
        payload.isAnonymous ? null : payload.company || null,
        payload.isAnonymous ? null : payload.phone || null,
        payload.isAnonymous ? null : payload.email || null,
        payload.vehicleRegistration || null,
        actor?.id || null,
        payload.reportType,
        payload.module || 'general',
        payload.severity,
        payload.locationId,
        payload.locationOther || null,
        payload.description,
        latitude,
        longitude,
        payload.occurredAt || new Date(),
        extra,
      ]
    );
    await conn.query(
      `INSERT INTO report_status_history (id, report_id, from_status, to_status, note, changed_by)
       VALUES (?, ?, NULL, 'open', 'Report submitted', ?)`,
      [uuid(), id, actor?.id || null]
    );
    return { id, reportNo };
  });

  await attachImages(report.id, files);
  const created = await getReportById(report.id, actor, { public: true });
  try {
    await notifyHighSeverity(
      { id: created.id, report_no: created.reportNo, severity: created.severity, description: created.description },
      created.locationName
    );
  } catch (err) {
    console.error('Alert dispatch failed', err.message);
  }
  return created;
}

async function listReports(filters, actor) {
  const where = [];
  const params = {};
  if (filters.status) {
    where.push('r.status = :status');
    params.status = filters.status;
  }
  if (filters.severity) {
    where.push('r.severity = :severity');
    params.severity = filters.severity;
  }
  if (filters.reportType) {
    where.push('r.report_type = :reportType');
    params.reportType = filters.reportType;
  }
  if (filters.module) {
    where.push('r.module = :module');
    params.module = filters.module;
  }
  if (filters.locationId) {
    where.push('r.location_id = :locationId');
    params.locationId = filters.locationId;
  }
  if (filters.q) {
    where.push('(r.report_no LIKE :q OR r.description LIKE :q OR r.reporter_name LIKE :q)');
    params.q = `%${filters.q}%`;
  }
  if (actor?.role === ROLES.EMPLOYEE) {
    where.push('r.reporter_user_id = :uid');
    params.uid = actor.id;
  }
  const sql = `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY r.created_at DESC LIMIT 500`;
  const rows = await query(sql, params);
  return rows.map(mapReport);
}

async function getReportById(id, actor, opts = {}) {
  const rows = await query(`${SELECT} WHERE r.id = ?`, [id]);
  if (!rows[0]) throw new NotFoundError('Report not found');
  if (actor?.role === ROLES.EMPLOYEE && rows[0].reporter_user_id !== actor.id) {
    throw new ForbiddenError('You can only view your own reports');
  }
  const report = mapReport(rows[0]);
  report.images = await loadImages(id);
  report.history = await loadHistory(id);
  if (opts.publicTrack) {
    return {
      reportNo: report.reportNo,
      status: report.status,
      assignedDepartment: report.assignedDepartment,
      closedAt: report.closedAt,
      locationName: report.locationName,
      severity: report.severity,
      reportType: report.reportType,
      createdAt: report.createdAt,
      history: report.history.map((h) => ({
        toStatus: h.to_status,
        note: h.note,
        createdAt: h.created_at,
      })),
    };
  }
  return report;
}

async function getReportByNumber(reportNo) {
  const rows = await query(`${SELECT} WHERE r.report_no = ?`, [reportNo]);
  if (!rows[0]) throw new NotFoundError('Report not found');
  return getReportById(rows[0].id, null, { publicTrack: true });
}

async function changeStatus(id, { status, note, assignedTo, assignedDepartment }, actor) {
  if (!REPORT_STATUSES.includes(status)) throw new AppError('Invalid status');
  const currentRows = await query('SELECT * FROM reports WHERE id = ?', [id]);
  if (!currentRows[0]) throw new NotFoundError('Report not found');
  const current = currentRows[0];
  const allowed = STATUS_TRANSITIONS[current.status] || [];
  if (status !== current.status && !allowed.includes(status)) {
    throw new AppError(`Cannot move from ${current.status} to ${status}`);
  }
  const firstResponse =
    !current.first_response_at && status !== 'open' ? new Date() : current.first_response_at;
  const closedAt = status === 'closed' ? new Date() : current.closed_at;

  await query(
    `UPDATE reports
     SET status = ?, assigned_to = COALESCE(?, assigned_to), assigned_department = COALESCE(?, assigned_department),
         first_response_at = ?, closed_at = ?
     WHERE id = ?`,
    [status, assignedTo || null, assignedDepartment || null, firstResponse, closedAt, id]
  );
  await query(
    `INSERT INTO report_status_history (id, report_id, from_status, to_status, note, changed_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuid(), id, current.status, status, note || null, actor.id]
  );
  return getReportById(id, actor);
}

async function assignReport(id, { assignedTo, assignedDepartment, note }, actor) {
  return changeStatus(id, { status: 'assigned', assignedTo, assignedDepartment, note }, actor);
}

module.exports = {
  createReport,
  listReports,
  getReportById,
  getReportByNumber,
  changeStatus,
  assignReport,
  mapReport,
};
