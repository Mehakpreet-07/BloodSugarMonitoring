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
const { sendEmail } = require('../utils/email');
const crypto = require('crypto'); // ⭐ FIX: Import crypto directly

// ⭐ FIX: Generate reset token directly in this file
async function generateResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + (60 * 60 * 1000); // 1 hour
  return { token, expiry };
}

function isResetTokenValid(expiry) {
  return Date.now() < expiry;
}

// REGISTER (Patients Only)
async function register(req, res) {
  try {
    const { name, email, password, healthCareNumber, dateOfBirth, phone, profileImage } = req.body;

    if (!name || !email || !password || !healthCareNumber || !dateOfBirth || !phone) {
        return res.status(400).json({ ok: false, error: 'All fields are required.' });
    }

    if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'Invalid email format.' });
    if (!isValidPassword(password)) return res.status(400).json({ ok: false, error: 'Password must be 8+ chars.' });
    if (healthCareNumber.length < 9) return res.status(400).json({ ok: false, error: 'Invalid Health Care Number.' });

    const exists = await db.findOne('patients', { email: email.toLowerCase() });
    if (exists) return res.status(400).json({ ok: false, error: 'Email already registered.' });

    const passwordHash = await hashPassword(password);
    const defaultSpec = await db.findOne('specialists', {}); 

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

// LOGIN
async function login(req, res) {
    const { email, password } = req.body;

    const limit = loginLimiter.check(email);
    if (!limit.allowed) return res.status(429).json({ ok: false, error: 'Too many attempts. Please wait.' });
    
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

// LOGOUT
async function logout(req, res) {
    clearCookie(res, 'sessionId');
    res.json({ ok: true });
}

// ME (Session Check)
async function me(req, res) {
    if (!req.user) return res.json({ user: null });
    const session = await db.findOne('sessions', { sessionId: req.cookies.sessionId });
    res.json({ user: req.user, csrfToken: session?.csrfToken });
}

// FORGOT PASSWORD (Request Reset)
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ ok: false, error: 'Email required' });

        let user = await db.findOne('patients', { email: email.toLowerCase() });
        let role = 'patient';
        if (!user) { user = await db.findOne('specialists', { email: email.toLowerCase() }); role = 'specialist'; }
        if (!user) { user = await db.findOne('staff', { email: email.toLowerCase() }); role = 'staff'; }
        if (!user) { user = await db.findOne('administrators', { email: email.toLowerCase() }); role = 'admin'; }

        if (!user) {
            console.log(`[Password Reset] Email not found: ${email}`);
            return res.json({ ok: true, message: 'If account exists, reset link sent.' });
        }

        const { token, expiry } = await generateResetToken();
        
        const table = role === 'patient' ? 'patients' : 
                      role === 'specialist' ? 'specialists' : 
                      role === 'staff' ? 'staff' : 'administrators';
        
        await db.updateById(table, user.id, {
            resetToken: token,
            resetTokenExpiry: expiry
        });

        const resetLink = `http://localhost:3000/#/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        
        await sendEmail(
            user.email,
            'Password Reset Request - Blood Sugar System',
            `Hello ${user.fullName || 'User'},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nBlood Sugar Monitoring System`
        );

        console.log(`\n🔐 [Password Reset Link]\n   Email: ${email}\n   Link: ${resetLink}\n`);

        await db.insert('auditLogs', {
            actorType: 'system',
            actionType: 'password_reset_requested',
            details: `Password reset requested for ${email}`,
            createdAt: new Date().toISOString()
        });

        res.json({ ok: true, message: 'If account exists, reset link sent.' });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
}

// RESET PASSWORD (Verify Token & Update)
async function resetPassword(req, res) {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ ok: false, error: 'All fields required' });
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ ok: false, error: 'Password must be 8+ characters' });
        }

        let user = await db.findOne('patients', { email: email.toLowerCase() });
        let role = 'patient';
        if (!user) { user = await db.findOne('specialists', { email: email.toLowerCase() }); role = 'specialist'; }
        if (!user) { user = await db.findOne('staff', { email: email.toLowerCase() }); role = 'staff'; }
        if (!user) { user = await db.findOne('administrators', { email: email.toLowerCase() }); role = 'admin'; }

        if (!user) {
            return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
        }

        if (user.resetToken !== token || !isResetTokenValid(user.resetTokenExpiry)) {
            return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
        }

        const passwordHash = await hashPassword(newPassword);
        const table = role === 'patient' ? 'patients' : 
                      role === 'specialist' ? 'specialists' : 
                      role === 'staff' ? 'staff' : 'administrators';

        await db.updateById(table, user.id, {
            passwordHash,
            resetToken: null,
            resetTokenExpiry: null
        });

        await db.insert('auditLogs', {
            actorType: role,
            actorId: user.id,
            actionType: 'password_reset_completed',
            details: `Password successfully reset for ${email}`,
            createdAt: new Date().toISOString()
        });

        res.json({ ok: true, message: 'Password reset successful' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
}

// UPDATE PROFILE
async function updateProfile(req, res) {
    try {
        const { id, role } = req.user;
        const { email, phone, profileImage, fullName, healthCareNumber, dateOfBirth, preferredUnit, fieldOfSpecialization, password } = req.body;
        
        let table = '';
        if (role === 'patient') table = 'patients';
        else if (role === 'specialist') table = 'specialists';
        else if (role === 'staff') table = 'staff';
        else if (role === 'admin') table = 'administrators';

        if (!table) return res.status(400).json({ error: 'Unknown role' });

        const updates = {};
        
        if (email) {
            if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
            updates.email = email.toLowerCase();
        }
        if (phone) updates.phone = phone;
        if (profileImage) updates.profileImage = profileImage;
        if (fullName) updates.fullName = fullName;

        if (password && password.trim().length > 0) {
             if (!isValidPassword(password)) return res.status(400).json({ error: 'Password must be 8+ chars.' });
             updates.passwordHash = await hashPassword(password);
        }

        if (role === 'patient') {
            if (healthCareNumber) updates.healthCareNumber = healthCareNumber;
            if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
            if (preferredUnit) updates.preferredUnit = preferredUnit;
        }
        
        if (role === 'specialist') {
            if (fieldOfSpecialization) updates.fieldOfSpecialization = fieldOfSpecialization;
        }

        if (Object.keys(updates).length > 0) {
            await db.updateById(table, id, updates);
            
            await db.insert('auditLogs', {
                actorType: role,
                actorId: id,
                actionType: 'profile_updated',
                details: 'User updated profile details',
                createdAt: new Date().toISOString()
            });
        }
        
        const updated = await db.findById(table, id);
        const { passwordHash, ...safeUser } = updated;
        
        res.json({ ok: true, user: safeUser });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
}

module.exports = { 
  register, 
  login, 
  logout, 
  me, 
  forgotPassword, 
  resetPassword, 
  updateProfile 
};