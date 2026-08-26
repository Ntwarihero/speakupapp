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
  await conn.end();
  console.log('Schema applied to', env.db.database);
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { migrate };
