const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ambulance_routing_super_secret_key_2026';

/**
 * Middleware: Verifies a JWT token from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Middleware factory: Restrict route access to specific roles.
 * Usage: requireRole('police') or requireRole('driver')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires role: ${roles.join(' or ')}.` });
    }
    next();
  };
}

/**
 * Signs a JWT with user payload.
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

module.exports = { verifyToken, requireRole, signToken };
