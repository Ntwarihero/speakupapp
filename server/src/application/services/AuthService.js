const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const { query } = require('../../infrastructure/database/pool');
const { hashPassword, verifyPassword } = require('../../infrastructure/auth/password');
const { signAccessToken, signRefreshToken, verifyRefresh } = require('../../infrastructure/auth/jwt');
const { UnauthorizedError, ForbiddenError, ConflictError, NotFoundError } = require('../../shared/errors');
const { ROLES } = require('../../shared/constants');

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    department: row.department,
    role: row.role,
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at,
  };
}

async function findByUsername(username) {
  const rows = await query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0] || null;
}

async function login({ username, password, ip, userAgent }) {
  const user = await findByUsername(username);
  if (!user || !user.is_active) throw new UnauthorizedError('Invalid username or password');
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new UnauthorizedError('Invalid username or password');

  const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username });
  const refreshToken = signRefreshToken({ sub: user.id, typ: 'refresh' });
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuid(), user.id, tokenHash, expiresAt, userAgent || null, ip || null]
  );
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  return { user: publicUser(user), accessToken, refreshToken };
}

async function refresh(refreshToken) {
  const payload = verifyRefresh(refreshToken);
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const rows = await query(
    `SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash, payload.sub]
  );
  if (!rows[0]) throw new UnauthorizedError('Refresh token is not recognised');

  const users = await query('SELECT * FROM users WHERE id = ? AND is_active = 1', [payload.sub]);
  if (!users[0]) throw new UnauthorizedError('Account is no longer active');

  const accessToken = signAccessToken({
    sub: users[0].id,
    role: users[0].role,
    username: users[0].username,
  });
  return { user: publicUser(users[0]), accessToken };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?', [tokenHash]);
}

async function createUser(actor, data) {
  if (actor.role !== ROLES.ADMINISTRATOR) {
    throw new ForbiddenError('Only administrators can create users');
  }
  const exists = await query('SELECT id FROM users WHERE username = ? OR email = ?', [data.username, data.email]);
  if (exists.length) throw new ConflictError('Username or email already exists');

  const id = uuid();
  await query(
    `INSERT INTO users (id, username, password_hash, full_name, email, phone, department, role, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.username,
      await hashPassword(data.password),
      data.fullName,
      data.email,
      data.phone || null,
      data.department || null,
      data.role,
      actor.id,
    ]
  );
  return getUser(id);
}

async function updateUser(id, data) {
  const user = await getUser(id);
  if (!user) throw new NotFoundError('User not found');
  const fields = [];
  const params = [];
  const map = {
    fullName: 'full_name',
    email: 'email',
    phone: 'phone',
    department: 'department',
    role: 'role',
    isActive: 'is_active',
  };
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(k === 'isActive' ? (data[k] ? 1 : 0) : data[k]);
    }
  }
  if (data.password) {
    fields.push('password_hash = ?');
    params.push(await hashPassword(data.password));
  }
  if (!fields.length) return user;
  params.push(id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  return getUser(id);
}

async function listUsers() {
  const rows = await query(
    'SELECT id, username, full_name, email, phone, department, role, is_active, last_login_at, created_at FROM users ORDER BY full_name'
  );
  return rows.map(publicUser);
}

async function getUser(id) {
  const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
  return publicUser(rows[0]);
}

module.exports = { login, refresh, logout, createUser, updateUser, listUsers, getUser, publicUser };
