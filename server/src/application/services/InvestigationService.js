const { v4: uuid } = require('uuid');
const { query } = require('../../infrastructure/database/pool');
const { NotFoundError } = require('../../shared/errors');

async function upsertInvestigation(reportId, data, actor) {
  const reports = await query('SELECT id FROM reports WHERE id = ?', [reportId]);
  if (!reports[0]) throw new NotFoundError('Report not found');

  const existing = await query('SELECT id FROM investigations WHERE report_id = ?', [reportId]);
  const fields = {
    incident_summary: data.incidentSummary,
    findings: data.findings,
    root_cause: data.rootCause,
    corrective_actions: data.correctiveActions,
    preventive_actions: data.preventiveActions,
    lessons_learned: data.lessonsLearned,
    why_1: data.why1,
    why_2: data.why2,
    why_3: data.why3,
    why_4: data.why4,
    why_5: data.why5,
    fishbone_people: data.fishbonePeople,
    fishbone_equipment: data.fishboneEquipment,
    fishbone_methods: data.fishboneMethods,
    fishbone_materials: data.fishboneMaterials,
    fishbone_environment: data.fishboneEnvironment,
    fishbone_management: data.fishboneManagement,
    status: data.status || 'draft',
    investigator_id: actor.id,
  };

  if (existing[0]) {
    const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    await query(`UPDATE investigations SET ${sets} WHERE id = ?`, [...Object.values(fields), existing[0].id]);
    if (data.status === 'submitted') {
      await query(`UPDATE reports SET status = 'under_investigation' WHERE id = ? AND status IN ('open','assigned')`, [
        reportId,
      ]);
    }
    return getInvestigation(reportId);
  }

  const id = uuid();
  await query(
    `INSERT INTO investigations (
      id, report_id, incident_summary, findings, root_cause, corrective_actions, preventive_actions,
      lessons_learned, why_1, why_2, why_3, why_4, why_5, fishbone_people, fishbone_equipment,
      fishbone_methods, fishbone_materials, fishbone_environment, fishbone_management, status, investigator_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, reportId, ...Object.values(fields)]
  );
  return getInvestigation(reportId);
}

async function getInvestigation(reportId) {
  const rows = await query(
    `SELECT i.*, u.full_name AS investigator_name, a.full_name AS approver_name
     FROM investigations i
     LEFT JOIN users u ON u.id = i.investigator_id
     LEFT JOIN users a ON a.id = i.approved_by
     WHERE i.report_id = ?`,
    [reportId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    reportId: r.report_id,
    incidentSummary: r.incident_summary,
    findings: r.findings,
    rootCause: r.root_cause,
    correctiveActions: r.corrective_actions,
    preventiveActions: r.preventive_actions,
    lessonsLearned: r.lessons_learned,
    why1: r.why_1,
    why2: r.why_2,
    why3: r.why_3,
    why4: r.why_4,
    why5: r.why_5,
    fishbonePeople: r.fishbone_people,
    fishboneEquipment: r.fishbone_equipment,
    fishboneMethods: r.fishbone_methods,
    fishboneMaterials: r.fishbone_materials,
    fishboneEnvironment: r.fishbone_environment,
    fishboneManagement: r.fishbone_management,
    status: r.status,
    investigatorName: r.investigator_name,
    approverName: r.approver_name,
    approvedAt: r.approved_at,
    updatedAt: r.updated_at,
  };
}

async function approveInvestigation(reportId, actor, approved) {
  const inv = await getInvestigation(reportId);
  if (!inv) throw new NotFoundError('Investigation not found');
  await query(
    `UPDATE investigations SET status = ?, approved_by = ?, approved_at = NOW() WHERE report_id = ?`,
    [approved ? 'approved' : 'rejected', actor.id, reportId]
  );
  if (approved) {
    await query(
      `UPDATE reports SET status = 'corrective_action' WHERE id = ? AND status = 'under_investigation'`,
      [reportId]
    );
  }
  return getInvestigation(reportId);
}

async function listActions(filters) {
  const where = [];
  const params = [];
  if (filters.reportId) {
    where.push('report_id = ?');
    params.push(filters.reportId);
  }
  if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  }
  await query(
    `UPDATE corrective_actions
     SET status = 'overdue'
     WHERE status IN ('open','in_progress') AND due_date < CURDATE()`
  );
  const rows = await query(
    `SELECT a.*, u.full_name AS responsible_user_name, r.report_no
     FROM corrective_actions a
     LEFT JOIN users u ON u.id = a.responsible_user_id
     JOIN reports r ON r.id = a.report_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY a.due_date ASC`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    reportId: row.report_id,
    reportNo: row.report_no,
    title: row.title,
    description: row.description,
    department: row.department,
    responsibleUserId: row.responsible_user_id,
    responsibleName: row.responsible_name || row.responsible_user_name,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
}

async function createAction(data) {
  const id = uuid();
  await query(
    `INSERT INTO corrective_actions
      (id, report_id, title, description, department, responsible_user_id, responsible_name, due_date, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
    [
      id,
      data.reportId,
      data.title,
      data.description,
      data.department,
      data.responsibleUserId || null,
      data.responsibleName || null,
      data.dueDate,
      data.priority || 'medium',
    ]
  );
  const rows = await listActions({ reportId: data.reportId });
  return rows.find((a) => a.id === id);
}

async function updateAction(id, data) {
  const fields = [];
  const params = [];
  const map = {
    title: 'title',
    description: 'description',
    department: 'department',
    responsibleUserId: 'responsible_user_id',
    responsibleName: 'responsible_name',
    dueDate: 'due_date',
    priority: 'priority',
    status: 'status',
  };
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(data[k]);
    }
  }
  if (data.status === 'completed') {
    fields.push('completed_at = NOW()');
  }
  if (!fields.length) return;
  params.push(id);
  await query(`UPDATE corrective_actions SET ${fields.join(', ')} WHERE id = ?`, params);
  const rows = await query('SELECT report_id FROM corrective_actions WHERE id = ?', [id]);
  const list = await listActions({ reportId: rows[0]?.report_id });
  return list.find((a) => a.id === id);
}

module.exports = {
  upsertInvestigation,
  getInvestigation,
  approveInvestigation,
  listActions,
  createAction,
  updateAction,
};
