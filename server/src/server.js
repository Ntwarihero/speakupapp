const { createApp } = require('./app');
const { env } = require('./config/env');
const { pool } = require('./infrastructure/database/pool');
const { ensureAuthSchema } = require('./infrastructure/database/migrate');

const app = createApp();

if (require.main === module) {
  ensureAuthSchema()
    .then(() => {
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
    })
    .catch((err) => {
      console.error('Failed to prepare database', err);
      process.exit(1);
    });
}

module.exports = app;
