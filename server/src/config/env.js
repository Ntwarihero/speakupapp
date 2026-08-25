const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

function requiredInProd(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (process.env.NODE_ENV === 'production' && !process.env[name]) {
    console.warn(`Missing ${name}; using a development fallback. Set this in Vercel Environment Variables.`);
  }
  return value;
}

function mysqlFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '').split('?')[0],
    };
  } catch {
    return null;
  }
}

const fromUrl = mysqlFromUrl(process.env.DATABASE_URL || process.env.MYSQL_URL);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  db: fromUrl || {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'speakup',
    password: process.env.DB_PASSWORD ?? 'speakup_dev_password',
    database: process.env.DB_NAME || 'speakup',
  },
  jwt: {
    accessSecret: requiredInProd('JWT_ACCESS_SECRET', 'dev-access-secret-change-me-32chars!!'),
    refreshSecret: requiredInProd('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-32chars'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  sessionIdleMs: Number(process.env.SESSION_IDLE_MS || 30 * 60 * 1000),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'SpeakUp <safety@dpworldkigali.com>',
  },
  alerts: {
    safetyManager: process.env.ALERT_SAFETY_MANAGER || 'safety.manager@dpworldkigali.com',
    operationsManager: process.env.ALERT_OPERATIONS_MANAGER || 'operations.manager@dpworldkigali.com',
    securityTeam: process.env.ALERT_SECURITY_TEAM || 'security@dpworldkigali.com',
  },
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    token: process.env.WHATSAPP_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_ID,
    safetyManager: process.env.WHATSAPP_SAFETY_MANAGER,
    operationsManager: process.env.WHATSAPP_OPERATIONS_MANAGER,
    security: process.env.WHATSAPP_SECURITY,
  },
  uploads: {
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 8),
    maxFiles: Number(process.env.MAX_FILES || 6),
    dir: process.env.VERCEL ? '/tmp/speakup-uploads' : path.resolve(__dirname, '../../uploads'),
  },
};

module.exports = { env };
