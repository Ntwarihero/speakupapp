const mysql = require('mysql2/promise');
const { env } = require('../../config/env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: process.env.VERCEL ? 4 : 12,
  connectTimeout: 8000,
  namedPlaceholders: true,
  timezone: 'Z',
  charset: 'utf8mb4',
  enableKeepAlive: !process.env.VERCEL,
  ssl: env.dbSsl ? { rejectUnauthorized: false } : undefined,
});

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction };
