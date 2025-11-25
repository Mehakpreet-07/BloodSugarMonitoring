// server/routes/admin.js
const { db } = require('../storage/db');
const { hashPassword } = require('../utils/security');

async function createProfessional(req, res) {
    try {
        const { fullName, email, password, phone, role, workingID, specialization } = req.body;
        
        // 1. Security Check
        if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
        
        // 2. FIX: Validation to prevent crash
        if (!fullName || !email || !password || !workingID) {
            return res.status(400).json({ error: 'Missing required fields (Name, Email, Pwd, WorkingID)' });
        }

        const table = role === 'specialist' ? 'specialists' : 'staff';
        const passwordHash = await hashPassword(password);

        await db.insert(table, {
            fullName, 
            email: email.toLowerCase(), 
            phone, 
            workingID,
            passwordHash,
            fieldOfSpecialization: specialization || null,
            profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
        });

        res.json({ ok: true });
    } catch (e) { res.status(500).json({error: e.message}); }
}

async function getUsers(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
    
    const p = await db.find('patients');
    const s = await db.find('specialists');
    const st = await db.find('staff');
    const a = await db.find('administrators');
    
    const all = [
        ...a.map(u => ({...u, role: 'admin'})),
        ...p.map(u => ({...u, role: 'patient'})),
        ...s.map(u => ({...u, role: 'specialist'})),
        ...st.map(u => ({...u, role: 'staff'}))
    ];
    
    res.json({ users: all });
}

// Feature: Admin Edit User (SRS 3.1.4.a)
async function updateUser(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
    const { id, role } = req.params;
    const updates = req.body;

    let table = '';
    if (role === 'patient') table = 'patients';
    else if (role === 'specialist') table = 'specialists';
    else if (role === 'staff') table = 'staff';
    else if (role === 'admin') table = 'administrators';

    if (!table) return res.status(400).json({ error: 'Invalid role' });

    // Securely update password if provided
    if (updates.password) {
        updates.passwordHash = await hashPassword(updates.password);
        delete updates.password;
    }

    await db.updateById(table, parseInt(id), updates);

    await db.insert('auditLogs', {
        actorType: 'admin',
        actorId: req.user.id,
        actionType: 'user_updated',
        details: `Admin modified user ${id} (${role})`,
        createdAt: new Date().toISOString()
    });

    res.json({ ok: true });
}

async function deleteUser(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
    const { id, role } = req.params;
    
    let table = '';
    if (role === 'patient') table = 'patients';
    else if (role === 'specialist') table = 'specialists';
    else if (role === 'staff') table = 'staff';
    else if (role === 'admin') table = 'administrators';

    if (!table) return res.status(400).json({ error: 'Invalid role' });

    await db.deleteById(table, parseInt(id));
    
    await db.insert('auditLogs', {
        actorType: 'admin',
        actorId: req.user.id,
        actionType: 'user_deleted',
        details: `Deleted user ${id} (${role})`,
        createdAt: new Date().toISOString()
    });

    res.json({ ok: true });
}

module.exports = { createProfessional, getUsers, deleteUser, updateUser };