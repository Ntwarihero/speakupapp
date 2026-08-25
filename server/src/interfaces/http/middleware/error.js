const { validationResult } = require('express-validator');
const { AppError } = require('../../../shared/errors');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return next(new AppError(first.msg || 'Validation failed', 422, 'VALIDATION'));
  }
  next();
}

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: {
      message: status === 500 ? 'An unexpected error occurred' : err.message,
      code: err.code || 'ERROR',
    },
  });
}

function notFound(_req, res) {
  res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
}

module.exports = { validate, errorHandler, notFound };
