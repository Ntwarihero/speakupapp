const { v4: uuid } = require('uuid');
const { query } = require('../database/pool');

async function writeAudit(req, { action, entity, entityId, metadata }) {
  const actor = req.user;
  await query(
    `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity, entity_id, ip_address, user_agent, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid(),
      actor?.id || null,
      actor?.fullName || actor?.full_name || actor?.username || 'public',
      actor?.role || req.body?.reporterCategory || 'public',
      action,
      entity,
      entityId || null,
      req.ip,
      typeof req.get === 'function' ? req.get('user-agent') : null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

module.exports = { writeAudit };
