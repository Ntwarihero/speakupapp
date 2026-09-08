const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const { buildRouter } = require('./interfaces/http/routes');
const { errorHandler, notFound } = require('./interfaces/http/middleware/error');
const { ensureAuthSchema } = require('./infrastructure/database/migrate');

let schemaReady;

function isPublicRead(req) {
  const full = String(req.originalUrl || req.url || '');
  if (/\/admin\//.test(full)) return false;
  const raw = full.split('?')[0];
  const pathParam = new URLSearchParams(full.split('?')[1] || '').get('path');
  const last = raw.split('/').filter(Boolean).pop() || pathParam || '';
  return ['health', 'locations', 'lookups'].includes(last);
}

function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(async (req, res, next) => {
    if (req.method === 'GET' && isPublicRead(req)) return next();
    try {
      schemaReady =
        schemaReady ||
        ensureAuthSchema().catch((err) => {
          console.error('ensureAuthSchema', err.message);
        });
      await schemaReady;
      next();
    } catch (err) {
      console.error('schema gate', err.message);
      next();
    }
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.nodeEnv !== 'production') return callback(null, true);
        const allowed = env.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean);
        if (allowed.includes('*') || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 180,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/uploads', express.static(env.uploads.dir));
  app.use('/api', buildRouter());
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
