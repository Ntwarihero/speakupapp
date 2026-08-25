const { createApp } = require('./app');
const { env } = require('./config/env');
const { pool } = require('./infrastructure/database/pool');

const app = createApp();

if (require.main === module) {
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`SpeakUp API listening on 0.0.0.0:${env.port}`);
  });

  const shutdown = async () => {
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
