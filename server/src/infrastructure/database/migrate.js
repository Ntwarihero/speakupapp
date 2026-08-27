const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { env } = require('../../config/env');

function schemaForExistingDatabase(sql) {
  return sql
    .replace(/CREATE DATABASE[\s\S]*?;/i, '')
    .replace(/USE\s+\w+\s*;/i, '');
}

async function migrate() {
  const schemaPath = path.resolve(__dirname, '../../../../database/schema.sql');
  const sql = schemaForExistingDatabase(fs.readFileSync(schemaPath, 'utf8'));
  const ssl = env.dbSsl ? { rejectUnauthorized: false } : undefined;

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: true,
    ssl,
  });

  await conn.query(sql);
  try {
    await conn.query('ALTER TABLE report_images ADD COLUMN file_data LONGBLOB NULL');
  } catch (err) {
    if (!/Duplicate column|ER_DUP_FIELDNAME/i.test(err.message)) {
      console.warn('file_data column:', err.message);
    }
  }
  try {
    await conn.query(
      'ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0'
    );
  } catch (err) {
    if (!/Duplicate column|ER_DUP_FIELDNAME/i.test(err.message)) {
      console.warn('must_change_password column:', err.message);
    }
  }
  await conn.end();
  console.log('Schema applied to', env.db.database);
}

async function ensureAuthSchema() {
  const ssl = env.dbSsl ? { rejectUnauthorized: false } : undefined;
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    ssl,
  });
  try {
    await conn.query(
      'ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0'
    );
  } catch (err) {
    if (!/Duplicate column|ER_DUP_FIELDNAME/i.test(err.message)) {
      throw err;
    }
  }
  await conn.query(`
    CREATE TABLE IF NOT EXISTS login_otps (
      id CHAR(36) NOT NULL PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      otp_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      attempts INT NOT NULL DEFAULT 0,
      purpose VARCHAR(20) NOT NULL DEFAULT 'login',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_otp_user (user_id),
      INDEX idx_otp_expires (expires_at)
    ) ENGINE=InnoDB
  `);
  try {
    await conn.query(
      "ALTER TABLE login_otps ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'login'"
    );
  } catch (err) {
    if (!/Duplicate column|ER_DUP_FIELDNAME/i.test(err.message)) {
      throw err;
    }
  }
  await conn.end();
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { migrate, ensureAuthSchema };
