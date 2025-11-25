// server/routes/auth.js
const { db } = require('../storage/db');
const { 
    hashPassword, 
    verifyPassword, 
    generateToken, 
    generateCSRFToken,
    loginLimiter 
} = require('../utils/security');
const { setSecureCookie, clearCookie } = require('../middleware/auth');

async function register(req, res) {
  try {
    console.log('Received Registration Request:', req.body);

    const { name, email, password, healthCareNumber, dateOfBirth, phone, profileImage } = req.body;

    // 1. Validation
    if (!name || !email || !password || !healthCareNumber) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    // 2. Check duplicates
    const exists = await db.findOne('patients', { email });
    if (exists) {
        return res.status(400).json({ ok: false, error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    
    // 3. FIX: Define defaultSpec before using it!
    // We try to find ANY specialist to assign as the default doctor.
    const defaultSpec = await db.findOne('specialists', {}); 

    // 4. Create Patient
    const patient = await db.insert('patients', {
      fullName: name,
      email: email.toLowerCase(),
      passwordHash,
      healthCareNumber,
      dateOfBirth: dateOfBirth || null,
      phone: phone || null,
      // Use the found ID, or null if no doctors exist yet
      assignedSpecialistId: defaultSpec ? defaultSpec.id : null,
      preferredUnit: 'mg/dL',
      profileImage: profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      registrationDate: new Date().toISOString()
    });

    console.log('Patient created successfully:', patient.id);
    res.status(201).json({ ok: true });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Server error during registration' });
  }
}

async function login(req, res) {
    const { email, password } = req.body;

    // Rate Limiting (Security Requirement)
    const limit = loginLimiter.check(email);
    if (!limit.allowed) {
        return res.status(429).json({ ok: false, error: 'Too many attempts. Please wait.' });
    }
    
    // Search all collections for the user
    let user = await db.findOne('patients', { email });
    let role = 'patient';
    
    if (!user) { user = await db.findOne('specialists', { email }); role = 'specialist'; }
    if (!user) { user = await db.findOne('staff', { email }); role = 'staff'; }
    if (!user) { user = await db.findOne('administrators', { email }); role = 'admin'; }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        loginLimiter.record(email);
        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    loginLimiter.reset(email); // Success!

    const sessionId = await generateToken();
    const csrfToken = await generateCSRFToken();
    
    await db.insert('sessions', {
        sessionId, userId: user.id, role, csrfToken, active: true,
        expiresAt: new Date(Date.now() + 30*60000).toISOString()
    });

    setSecureCookie(res, 'sessionId', sessionId);
    
    res.json({ ok: true, user: { ...user, role, patientId: role==='patient'?user.id:null }, csrfToken });
}

async function logout(req, res) {
    clearCookie(res, 'sessionId');
    res.json({ ok: true });
}

async function me(req, res) {
    if (!req.user) return res.json({ user: null });
    const session = await db.findOne('sessions', { sessionId: req.cookies.sessionId });
    res.json({ user: req.user, csrfToken: session?.csrfToken });
}

module.exports = { register, login, logout, me };