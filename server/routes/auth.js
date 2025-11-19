// Authentication routes
const { db } = require('../storage/db');
const { 
  hashPassword, 
  verifyPassword, 
  generateToken,
  generateCSRFToken,
  isValidEmail,
  isValidPassword,
  loginLimiter 
} = require('../utils/security');
const { setSecureCookie, clearCookie, cookieParser } = require('../middleware/auth');
const { validateRequiredFields } = require('../utils/helpers');

/**
 * POST /api/auth/register - Patient self-registration
 */
async function register(req, res) {
  try {
    const { name, email, password, healthCareNumber, dateOfBirth, phone } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['name', 'email', 'password']);
    if (!validation.valid) {
      return res.status(400).json({ ok: false, error: validation.error });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Password must be at least 8 characters long' 
      });
    }

    // Check if email already exists
    const existingPatient = await db.findOne('patients', { email: email.toLowerCase() });
    if (existingPatient) {
      return res.status(400).json({ ok: false, error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create patient
    const patient = await db.insert('patients', {
      fullName: name,
      email: email.toLowerCase(),
      passwordHash,
      healthCareNumber: healthCareNumber || null,
      dateOfBirth: dateOfBirth || null,
      phone: phone || null,
      preferredUnit: 'mg/dL',
      registrationDate: new Date().toISOString()
    });

    // Log audit
    await db.insert('auditLogs', {
      actorType: 'System',
      actorId: patient.id,
      actionType: 'patient_registered',
      resourceType: 'Patient',
      resourceId: patient.id,
      details: `New patient registered: ${email}`,
      createdAt: new Date().toISOString()
    });

    // Return success (don't auto-login, require explicit login)
    return res.status(201).json({
      ok: true,
      message: 'Registration successful. Please log in.',
      user: {
        id: patient.id,
        name: patient.fullName,
        email: patient.email
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ ok: false, error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/login - User login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }

    // Rate limiting check
    const rateLimitCheck = loginLimiter.check(email);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        ok: false, 
        error: 'Too many login attempts. Please try again later.',
        resetTime: rateLimitCheck.resetTime
      });
    }

    // Try to find user in all user collections
    let user = null;
    let role = null;

    // Check patients
    user = await db.findOne('patients', { email: email.toLowerCase() });
    if (user) role = 'patient';

    // Check specialists
    if (!user) {
      user = await db.findOne('specialists', { email: email.toLowerCase() });
      if (user) role = 'specialist';
    }

    // Check staff
    if (!user) {
      user = await db.findOne('staff', { email: email.toLowerCase() });
      if (user) role = 'staff';
    }

    // Check administrators
    if (!user) {
      user = await db.findOne('administrators', { email: email.toLowerCase() });
      if (user) role = 'admin';
    }

    if (!user || !user.passwordHash) {
      loginLimiter.record(email);
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      loginLimiter.record(email);
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    // Reset rate limiter on successful login
    loginLimiter.reset(email);

    // Create session
    const sessionId = await generateToken();
    const csrfToken = await generateCSRFToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.insert('sessions', {
      sessionId,
      userId: user.id,
      role,
      csrfToken,
      active: true,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    });

    // Set secure cookie
    setSecureCookie(res, 'sessionId', sessionId, 30 * 60 * 1000);

    // Log audit
    await db.insert('auditLogs', {
      actorType: role,
      actorId: user.id,
      actionType: 'login',
      resourceType: 'Session',
      details: `User logged in: ${email}`,
      createdAt: new Date().toISOString()
    });

    // Return user data (without password)
    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        role,
        name: user.fullName || user.name,
        email: user.email,
        patientId: user.patientId || (role === 'patient' ? user.id : null),
        preferredUnit: user.preferredUnit || 'mg/dL'
      },
      csrfToken
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
}

/**
 * POST /api/auth/logout - User logout
 */
async function logout(req, res) {
  try {
    const sessionId = req.cookies?.sessionId;

    if (sessionId) {
      // Deactivate session
      await db.update('sessions', { sessionId }, { 
        active: false,
        updatedAt: new Date().toISOString()
      });

      // Log audit
      if (req.user) {
        await db.insert('auditLogs', {
          actorType: req.user.role,
          actorId: req.user.id,
          actionType: 'logout',
          resourceType: 'Session',
          details: `User logged out`,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Clear cookie
    clearCookie(res, 'sessionId');

    return res.status(200).json({ ok: true, message: 'Logged out successfully' });

  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ ok: false, error: 'Logout failed' });
  }
}

/**
 * GET /api/auth/me - Get current user
 */
async function me(req, res) {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      return res.status(200).json({ user: null });
    }

    const session = await db.findOne('sessions', { sessionId, active: true });

    if (!session) {
      clearCookie(res, 'sessionId');
      return res.status(200).json({ user: null });
    }

    // Check expiration
    const now = new Date();
    const expires = new Date(session.expiresAt);

    if (now > expires) {
      await db.update('sessions', { sessionId }, { active: false });
      clearCookie(res, 'sessionId');
      return res.status(200).json({ user: null });
    }

    // Load user
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
      await db.update('sessions', { sessionId }, { active: false });
      clearCookie(res, 'sessionId');
      return res.status(200).json({ user: null });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        role: session.role,
        name: user.fullName || user.name,
        email: user.email,
        patientId: user.patientId || (session.role === 'patient' ? user.id : null),
        preferredUnit: user.preferredUnit || 'mg/dL'
      },
      csrfToken: session.csrfToken
    });

  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get user data' });
  }
}

module.exports = {
  register,
  login,
  logout,
  me
};
