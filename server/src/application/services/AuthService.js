const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const { query } = require('../../infrastructure/database/pool');
const { hashPassword, verifyPassword } = require('../../infrastructure/auth/password');
const { signAccessToken, signRefreshToken, verifyRefresh } = require('../../infrastructure/auth/jwt');
const { UnauthorizedError, ForbiddenError, ConflictError, NotFoundError, AppError } = require('../../shared/errors');
const { ROLES } = require('../../shared/constants');
const { sendWelcomeCredentials, sendLoginOtp, sendPasswordResetOtp } = require('../../infrastructure/notifications/accountMail');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

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
    mustChangePassword: Boolean(row.must_change_password),
  };
}

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return email;
  const keep = local.slice(0, 1);
  return `${keep}***@${domain}`;
}

function generateDefaultPassword() {
  const chunk = crypto.randomBytes(4).toString('hex');
  return `Spk@${chunk}9A`;
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function assertNewPassword(password) {
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new AppError('Password must include letters and numbers', 400, 'WEAK_PASSWORD');
  }
}

async function findByUsername(username) {
  const rows = await query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0] || null;
}

async function issueSession(user, { ip, userAgent }) {
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

async function createLoginOtp(user) {
  await query(
    `UPDATE login_otps SET consumed_at = NOW()
     WHERE user_id = ? AND consumed_at IS NULL AND purpose = 'login'`,
    [user.id]
  );
  const otp = String(crypto.randomInt(100000, 1000000));
  const id = uuid();
  await query(
    `INSERT INTO login_otps (id, user_id, otp_hash, expires_at, purpose)
     VALUES (?, ?, ?, ?, 'login')`,
    [id, user.id, hashOtp(otp), new Date(Date.now() + OTP_TTL_MS)]
  );
  await sendLoginOtp({ to: user.email, fullName: user.full_name, otp });
  return id;
}

async function createResetOtp(user) {
  await query(
    `UPDATE login_otps SET consumed_at = NOW()
     WHERE user_id = ? AND consumed_at IS NULL AND purpose = 'reset'`,
    [user.id]
  );
  const otp = String(crypto.randomInt(100000, 1000000));
  const id = uuid();
  await query(
    `INSERT INTO login_otps (id, user_id, otp_hash, expires_at, purpose)
     VALUES (?, ?, ?, ?, 'reset')`,
    [id, user.id, hashOtp(otp), new Date(Date.now() + OTP_TTL_MS)]
  );
  await sendPasswordResetOtp({ to: user.email, fullName: user.full_name, otp });
  return id;
}

async function findByUsernameOrEmail(identifier) {
  const value = String(identifier || '').trim();
  if (!value) return null;
  const rows = await query(
    'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
    [value, value]
  );
  return rows[0] || null;
}

async function requestPasswordReset({ username }) {
  const user = await findByUsernameOrEmail(username);
  const generic = {
    ok: true,
    message: 'If an account exists, a reset code was sent to the registered email.',
  };
  if (!user || !user.is_active) return generic;
  const challengeId = await createResetOtp(user);
  return {
    ...generic,
    challengeId,
    emailHint: maskEmail(user.email),
  };
}

async function resetPassword({ challengeId, otp, newPassword }) {
  if (!challengeId || !otp) throw new UnauthorizedError('Verification code is required');
  assertNewPassword(newPassword);
  const rows = await query(
    "SELECT * FROM login_otps WHERE id = ? AND purpose = 'reset'",
    [challengeId]
  );
  const challenge = rows[0];
  if (!challenge || challenge.consumed_at) {
    throw new UnauthorizedError('Reset code is not valid');
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    throw new UnauthorizedError('Reset code has expired');
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new UnauthorizedError('Too many incorrect codes. Request a new reset');
  }
  if (hashOtp(otp) !== challenge.otp_hash) {
    await query('UPDATE login_otps SET attempts = attempts + 1 WHERE id = ?', [challengeId]);
    throw new UnauthorizedError('Incorrect verification code');
  }

  await query('UPDATE login_otps SET consumed_at = NOW() WHERE id = ?', [challengeId]);
  await query(
    'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [await hashPassword(newPassword), challenge.user_id]
  );
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
    [challenge.user_id]
  );
  return { ok: true };
}

async function login({ username, password }) {
  const user = await findByUsername(username);
  if (!user || !user.is_active) throw new UnauthorizedError('Invalid username or password');
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new UnauthorizedError('Invalid username or password');

  const challengeId = await createLoginOtp(user);
  return {
    requiresOtp: true,
    challengeId,
    emailHint: maskEmail(user.email),
  };
}

async function verifyOtp({ challengeId, otp, ip, userAgent }) {
  if (!challengeId || !otp) throw new UnauthorizedError('Verification code is required');
  const rows = await query('SELECT * FROM login_otps WHERE id = ?', [challengeId]);
  const challenge = rows[0];
  if (!challenge || challenge.consumed_at) {
    throw new UnauthorizedError('Verification code is not valid');
  }
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    throw new UnauthorizedError('Verification code has expired');
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new UnauthorizedError('Too many incorrect codes. Sign in again');
  }

  const match = hashOtp(otp) === challenge.otp_hash;
  if (!match) {
    await query('UPDATE login_otps SET attempts = attempts + 1 WHERE id = ?', [challengeId]);
    throw new UnauthorizedError('Incorrect verification code');
  }

  await query('UPDATE login_otps SET consumed_at = NOW() WHERE id = ?', [challengeId]);
  const users = await query('SELECT * FROM users WHERE id = ? AND is_active = 1', [challenge.user_id]);
  if (!users[0]) throw new UnauthorizedError('Account is no longer active');
  return issueSession(users[0], { ip, userAgent });
}

async function resendOtp({ challengeId }) {
  if (!challengeId) throw new AppError('Sign in again to request a new code', 400);
  const rows = await query('SELECT * FROM login_otps WHERE id = ?', [challengeId]);
  const challenge = rows[0];
  if (!challenge || challenge.consumed_at) {
    throw new UnauthorizedError('Sign in again to request a new code');
  }
  const users = await query('SELECT * FROM users WHERE id = ? AND is_active = 1', [challenge.user_id]);
  if (!users[0]) throw new UnauthorizedError('Account is no longer active');
  const nextId = await createLoginOtp(users[0]);
  return { requiresOtp: true, challengeId: nextId, emailHint: maskEmail(users[0].email) };
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

async function changePassword(actor, { currentPassword, newPassword }) {
  if (!actor?.id) throw new UnauthorizedError();
  assertNewPassword(newPassword);
  const rows = await query('SELECT * FROM users WHERE id = ?', [actor.id]);
  const user = rows[0];
  if (!user) throw new NotFoundError('User not found');
  const ok = await verifyPassword(currentPassword, user.password_hash);
  if (!ok) throw new UnauthorizedError('Current password is incorrect');
  if (currentPassword === newPassword) {
    throw new AppError('Choose a different password from the current one', 400, 'WEAK_PASSWORD');
  }
  await query(
    'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [await hashPassword(newPassword), actor.id]
  );
  return getUser(actor.id);
}

async function createUser(actor, data) {
  if (actor.role !== ROLES.ADMINISTRATOR) {
    throw new ForbiddenError('Only administrators can create users');
  }
  const exists = await query('SELECT id FROM users WHERE username = ? OR email = ?', [data.username, data.email]);
  if (exists.length) throw new ConflictError('Username or email already exists');

  const temporaryPassword = data.password && String(data.password).length >= 8
    ? String(data.password)
    : generateDefaultPassword();
  const id = uuid();
  try {
    await query(
      `INSERT INTO users (id, username, password_hash, full_name, email, phone, department, role, created_by, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        data.username,
        await hashPassword(temporaryPassword),
        data.fullName,
        data.email,
        data.phone || null,
        data.department || null,
        data.role,
        actor.id,
      ]
    );
    await sendWelcomeCredentials({
      to: data.email,
      fullName: data.fullName,
      username: data.username,
      password: temporaryPassword,
    });
  } catch (err) {
    await query('DELETE FROM users WHERE id = ?', [id]).catch(() => {});
    throw err;
  }
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
    assertNewPassword(data.password);
    fields.push('password_hash = ?');
    params.push(await hashPassword(data.password));
    fields.push('must_change_password = ?');
    params.push(1);
  }
  if (!fields.length) return user;
  params.push(id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  return getUser(id);
}

async function listUsers() {
  const rows = await query(
    'SELECT id, username, full_name, email, phone, department, role, is_active, last_login_at, created_at, must_change_password FROM users ORDER BY full_name'
  );
  return rows.map(publicUser);
}

async function getUser(id) {
  const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
  return publicUser(rows[0]);
}

module.exports = {
  login,
  verifyOtp,
  resendOtp,
  requestPasswordReset,
  resetPassword,
  refresh,
  logout,
  changePassword,
  createUser,
  updateUser,
  listUsers,
  getUser,
  publicUser,
};
