const { verifyAccess } = require('../../../infrastructure/auth/jwt');
const { UnauthorizedError, ForbiddenError } = require('../../../shared/errors');
const AuthService = require('../../../application/services/AuthService');

async function optionalAuth(req, _res, next) {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = verifyAccess(header.slice(7));
    req.user = await AuthService.getUser(payload.sub);
    next();
  } catch {
    next();
  }
}

async function requireAuth(req, _res, next) {
  try {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
    const payload = verifyAccess(header.slice(7));
    const user = await AuthService.getUser(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedError('Account is inactive');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

module.exports = { optionalAuth, requireAuth, requireRoles };
