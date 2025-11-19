// Authentication and authorization middleware
const { db } = require('../storage/db');
const { generateCSRFToken } = require('../utils/security');

/**
 * Session middleware - checks if user is authenticated
 */
async function requireAuth(req, res, next) {
  const sessionId = req.cookies?.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  try {
    const session = await db.findOne('sessions', { sessionId, active: true });
    
    if (!session) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
    }

    // Check session expiration
    const now = new Date();
    const expires = new Date(session.expiresAt);
    
    if (now > expires) {
      await db.update('sessions', { sessionId }, { active: false });
      return res.status(401).json({ ok: false, error: 'Session expired' });
    }

    // OPTIMIZATION: Reduce disk writes on Windows
    // Only extend session if more than 5 minutes have passed since last update.
    // This prevents EPERM errors when dashboard fires multiple requests at once.
    const maxAge = 30 * 60 * 1000; // 30 mins
    const timeRemaining = expires.getTime() - now.getTime();
    
    // If less than 25 mins remaining (meaning 5 mins passed), extend it
    if (timeRemaining < (maxAge - (5 * 60 * 1000))) {
        const newExpiry = new Date(now.getTime() + maxAge);
        try {
            await db.update('sessions', { sessionId }, { expiresAt: newExpiry.toISOString() });
        } catch (writeErr) {
            // If file is locked, just ignore it. It's not critical.
            // This prevents the app from crashing on EPERM errors.
        }
    }

    // Load user data
    let user;
    switch (session.role) {
      case 'patient':
        user = await db.findById('patients', session.userId);
        break;
      case 'specialist':
        user = await db.findById('specialists', session.userId);
        break;
      case 'staff':
        user = await db.findById('staff', session.userId);
        break;
      case 'admin':
        user = await db.findById('administrators', session.userId);
        break;
    }

    if (!user) {
      return res.status(401).json({ ok: false, error: 'User not found' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: session.role,
      name: user.fullName || user.name,
      email: user.email,
      patientId: user.patientId || user.id
    };
    req.sessionId = sessionId;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ ok: false, error: 'Authentication error' });
  }
}

/**
 * Role-based authorization middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Access forbidden: insufficient permissions' 
      });
    }

    next();
  };
}

/**
 * CSRF protection middleware
 */
async function requireCSRF(req, res, next) {
  const csrfToken = req.headers['x-csrf-token'];
  const sessionId = req.cookies?.sessionId;

  if (!csrfToken || !sessionId) {
    return res.status(403).json({ ok: false, error: 'CSRF token required' });
  }

  try {
    const session = await db.findOne('sessions', { sessionId });
    
    if (!session || session.csrfToken !== csrfToken) {
      return res.status(403).json({ ok: false, error: 'Invalid CSRF token' });
    }

    next();
  } catch (err) {
    console.error('CSRF middleware error:', err);
    return res.status(500).json({ ok: false, error: 'CSRF validation error' });
  }
}

/**
 * Patient-specific resource ownership check
 */
function requireOwnership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  if (['admin', 'specialist', 'staff'].includes(req.user.role)) {
    return next();
  }

  if (req.user.role === 'patient') {
    const requestedPatientId = parseInt(req.params.patientId || req.params.id);
    const userPatientId = req.user.patientId || req.user.id;

    if (requestedPatientId !== userPatientId) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Access forbidden: you can only access your own data' 
      });
    }
  }

  next();
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    cookies[name.trim()] = rest.join('=').trim();
  });

  return cookies;
}

function cookieParser(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  next();
}

function setSecureCookie(res, name, value, maxAge = 30 * 60 * 1000) {
  const cookie = [
    `${name}=${value}`,
    `Max-Age=${Math.floor(maxAge / 1000)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/'
  ].join('; ');

  res.setHeader('Set-Cookie', cookie);
}

function clearCookie(res, name) {
  setSecureCookie(res, name, '', 0);
}

/**
 * Audit logging middleware
 */
async function auditLog(actionType, resourceType = null) {
  return async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;

    const logAfterResponse = async (data) => {
      if (res.statusCode < 400) { 
        try {
          await db.insert('auditLogs', {
            actorType: req.user?.role || 'System',
            actorId: req.user?.id || null,
            actionType,
            resourceType,
            resourceId: req.params?.id ? parseInt(req.params.id) : null,
            details: `${req.method} ${req.url}`,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.error('Audit log error:', err);
        }
      }
    };

    res.send = function(data) {
      logAfterResponse(data);
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      logAfterResponse(data);
      return originalJson.call(this, data);
    };

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireCSRF,
  requireOwnership,
  cookieParser,
  setSecureCookie,
  clearCookie,
  auditLog
};