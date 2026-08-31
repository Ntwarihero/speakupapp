/**
 * Copy local SpeakUp MySQL into Aiven defaultdb over SSL.
 * Usage: node scripts/import-to-aiven.js
 * Reads DATABASE_URL from env or the commented line in .env.
 */
const fs = require('fs');
const path = require('path');
const mysql = require(path.join(__dirname, '../server/node_modules/mysql2/promise'));

const root = path.resolve(__dirname, '..');

const TABLE_ORDER = [
  'users',
  'locations',
  'report_categories',
  'system_settings',
  'report_sequences',
  'reports',
  'report_images',
  'report_status_history',
  'investigations',
  'investigation_attachments',
  'corrective_actions',
  'announcements',
  'training_materials',
  'notification_log',
  'audit_logs',
  'login_otps',
  'refresh_tokens',
];

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  const envFile = fs.readFileSync(path.join(root, '.env'), 'utf8');
  const match = envFile.match(/^\s*#?\s*DATABASE_URL=(mysql:\/\/\S+)/m);
  if (!match) throw new Error('DATABASE_URL not found in env or .env');
  return match[1].trim();
}

function parseMysqlUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, '').split('?')[0],
  };
}

function schemaForAiven(sql) {
  return sql
    .replace(/CREATE DATABASE[\s\S]*?;/i, '')
    .replace(/USE\s+\w+\s*;/i, '');
}

async function copyTable(src, dest, name) {
  const [rows] = await src.query(`SELECT * FROM \`${name}\``);
  if (!rows.length) {
    console.log(`  ${name}: 0`);
    return 0;
  }
  const [destCols] = await dest.query(`SHOW COLUMNS FROM \`${name}\``);
  const allowed = new Set(destCols.map((c) => c.Field));
  const cols = Object.keys(rows[0]).filter((c) => allowed.has(c));
  const colList = cols.map((c) => `\`${c}\``).join(',');
  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT INTO \`${name}\` (${colList}) VALUES (${placeholders})`;
  for (const row of rows) {
    await dest.query(
      sql,
      cols.map((c) => row[c])
    );
  }
  console.log(`  ${name}: ${rows.length}`);
  return rows.length;
}

async function main() {
  const db = parseMysqlUrl(readDatabaseUrl());
  const ssl = { rejectUnauthorized: false };
  const schemaPath = path.join(root, 'database', 'schema.sql');

  console.log(`Connecting to ${db.host}:${db.port}/${db.database} (SSL)`);
  const dest = await mysql.createConnection({
    ...db,
    multipleStatements: true,
    ssl,
    charset: 'utf8mb4',
  });
  const src = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'speakup',
    charset: 'utf8mb4',
  });

  const [[before]] = await dest.query(
    'SELECT COUNT(*) AS tables_n FROM information_schema.tables WHERE table_schema = DATABASE()'
  );
  console.log('Existing tables on Aiven:', before.tables_n);

  await dest.query('SET FOREIGN_KEY_CHECKS = 0');
  const [tables] = await dest.query(
    'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE()'
  );
  for (const row of tables) {
    await dest.query(`DROP TABLE IF EXISTS \`${row.name}\``);
  }
  console.log('Dropped', tables.length, 'tables');

  await dest.query(schemaForAiven(fs.readFileSync(schemaPath, 'utf8')));
  console.log('Applied schema.sql');

  await dest.query('SET FOREIGN_KEY_CHECKS = 0');
  console.log('Copying rows from local speakup');
  for (const name of TABLE_ORDER) {
    await copyTable(src, dest, name);
  }

  await dest.query(`
    UPDATE users
    SET email = TRIM(REPLACE(REPLACE(email, CHAR(13), ''), CHAR(10), '')),
        full_name = TRIM(REPLACE(REPLACE(full_name, CHAR(13), ''), CHAR(10), ''))
  `);
  await dest.query('SET FOREIGN_KEY_CHECKS = 1');

  const [[counts]] = await dest.query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM reports) AS reports,
      (SELECT COUNT(*) FROM locations) AS locations,
      (SELECT COUNT(*) FROM report_categories) AS categories
  `);
  console.log('Aiven counts', counts);
  await src.end();
  await dest.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
