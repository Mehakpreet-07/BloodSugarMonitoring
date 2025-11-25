// server/routes/auth.js
const { db } = require('../storage/db');
const { 
    hashPassword, 
    verifyPassword, 
    generateToken, 
    generateCSRFToken,
    loginLimiter,
    isValidEmail,    
    isValidPassword 
} = require('../utils/security');
const { setSecureCookie, clearCookie } = require('../middleware/auth');

// -----------------------------------------
// REGISTER (Patients Only - Self Service)
// -----------------------------------------
async function register(req, res) {
  try {
    const { name, email, password, healthCareNumber, dateOfBirth, phone, profileImage } = req.body;

    // 1. Check Required Fields
    if (!name || !email || !password || !healthCareNumber || !dateOfBirth || !phone) {
        return res.status(400).json({ ok: false, error: 'All fields are required.' });
    }

    // 2. Strict Input Validation (SRS 3.2.2.a)
    if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'Invalid email format.' });
    if (!isValidPassword(password)) return res.status(400).json({ ok: false, error: 'Password must be 8+ chars.' });
    if (healthCareNumber.length < 9) return res.status(400).json({ ok: false, error: 'Invalid Health Care Number.' });

    // 3. Check Duplicates
    const exists = await db.findOne('patients', { email: email.toLowerCase() });
    if (exists) return res.status(400).json({ ok: false, error: 'Email already registered.' });

    const passwordHash = await hashPassword(password);
    
    // Assign Default Doctor (First available specialist)
    const defaultSpec = await db.findOne('specialists', {}); 

    // 4. Create Record
    const patient = await db.insert('patients', {
      fullName: name,
      email: email.toLowerCase(),
      passwordHash,
      healthCareNumber,
      dateOfBirth,
      phone,
      assignedSpecialistId: defaultSpec ? defaultSpec.id : null,
      preferredUnit: 'mg/dL',
      profileImage: profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      registrationDate: new Date().toISOString()
    });

    await db.insert('auditLogs', {
        actorType: 'system',
        actionType: 'patient_registered',
        details: `New registration: ${email}`,
        createdAt: new Date().toISOString()
    });

    res.status(201).json({ ok: true });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}

// -----------------------------------------
// LOGIN
// -----------------------------------------
async function login(req, res) {
    const { email, password } = req.body;

    // Rate Limiting
    const limit = loginLimiter.check(email);
    if (!limit.allowed) return res.status(429).json({ ok: false, error: 'Too many attempts. Please wait.' });
    
    // Search all collections
    let user = await db.findOne('patients', { email: email.toLowerCase() });
    let role = 'patient';
    
    if (!user) { user = await db.findOne('specialists', { email: email.toLowerCase() }); role = 'specialist'; }
    if (!user) { user = await db.findOne('staff', { email: email.toLowerCase() }); role = 'staff'; }
    if (!user) { user = await db.findOne('administrators', { email: email.toLowerCase() }); role = 'admin'; }

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        loginLimiter.record(email);
        return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    loginLimiter.reset(email);

    const sessionId = await generateToken();
    const csrfToken = await generateCSRFToken();
    
    await db.insert('sessions', {
        sessionId, userId: user.id, role, csrfToken, active: true,
        expiresAt: new Date(Date.now() + 30*60000).toISOString()
    });

    setSecureCookie(res, 'sessionId', sessionId);
    
    res.json({ ok: true, user: { ...user, role, patientId: role==='patient'?user.id:null }, csrfToken });
}

// -----------------------------------------
// LOGOUT
// -----------------------------------------
async function logout(req, res) {
    clearCookie(res, 'sessionId');
    res.json({ ok: true });
}

// -----------------------------------------
// ME (Session Check)
// -----------------------------------------
async function me(req, res) {
    if (!req.user) return res.json({ user: null });
    const session = await db.findOne('sessions', { sessionId: req.cookies.sessionId });
    res.json({ user: req.user, csrfToken: session?.csrfToken });
}

// -----------------------------------------
// UPDATE PROFILE (Universal & Secure)
// -----------------------------------------
async function updateProfile(req, res) {
    try {
        const { id, role } = req.user;
        // Pull ONLY safe fields
        const { email, phone, profileImage, fullName, healthCareNumber, dateOfBirth, preferredUnit, fieldOfSpecialization, password } = req.body;
        
        let table = '';
        if (role === 'patient') table = 'patients';
        else if (role === 'specialist') table = 'specialists';
        else if (role === 'staff') table = 'staff';
        else if (role === 'admin') table = 'administrators';

        if (!table) return res.status(400).json({ error: 'Unknown role' });

        const updates = {};
        
        // 1. Universal Fields (Everyone has these)
        if (email) {
            if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
            updates.email = email.toLowerCase();
        }
        if (phone) updates.phone = phone;
        if (profileImage) updates.profileImage = profileImage;
        if (fullName) updates.fullName = fullName;

        // 2. Password Update Logic (SRS Requirement)
        if (password && password.trim().length > 0) {
             if (!isValidPassword(password)) return res.status(400).json({ error: 'Password must be 8+ chars.' });
             updates.passwordHash = await hashPassword(password);
        }

        // 3. Role-Specific Fields (Strict Separation)
        if (role === 'patient') {
            if (healthCareNumber) updates.healthCareNumber = healthCareNumber;
            if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
            if (preferredUnit) updates.preferredUnit = preferredUnit;
        }
        
        if (role === 'specialist') {
            // Doctors can update their specialization
            if (fieldOfSpecialization) updates.fieldOfSpecialization = fieldOfSpecialization;
        }

        // Perform Update
        if (Object.keys(updates).length > 0) {
            await db.updateById(table, id, updates);
            
            // Log action
            await db.insert('auditLogs', {
                actorType: role,
                actorId: id,
                actionType: 'profile_updated',
                details: 'User updated profile details',
                createdAt: new Date().toISOString()
            });
        }
        
        // Return updated user
        const updated = await db.findById(table, id);
        const { passwordHash, ...safeUser } = updated;
        
        res.json({ ok: true, user: safeUser });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
}

module.exports = { register, login, logout, me, updateProfile };