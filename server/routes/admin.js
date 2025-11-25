// server/routes/admin.js
const { db } = require('../storage/db');
const { hashPassword } = require('../utils/security');

// --- USER MANAGEMENT ---

async function createProfessional(req, res) {
    try {
        const { fullName, email, password, phone, role, workingID, specialization } = req.body;
        if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
        
        if (!fullName || !email || !password || !workingID) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const table = role === 'specialist' ? 'specialists' : 'staff';
        const passwordHash = await hashPassword(password);

        await db.insert(table, {
            fullName, email: email.toLowerCase(), phone, workingID,
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

    if (updates.password) {
        updates.passwordHash = await hashPassword(updates.password);
        delete updates.password;
    }

    await db.updateById(table, parseInt(id), updates);
    await db.insert('auditLogs', {
        actorType: 'admin', actorId: req.user.id, actionType: 'user_updated',
        details: `Admin modified user ${id} (${role})`, createdAt: new Date().toISOString()
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

    await db.deleteById(table, parseInt(id));
    await db.insert('auditLogs', {
        actorType: 'admin', actorId: req.user.id, actionType: 'user_deleted',
        details: `Deleted user ${id} (${role})`, createdAt: new Date().toISOString()
    });
    res.json({ ok: true });
}

// --- BACKUP & RESTORE (SDD 3.2.11) ---

async function getFullBackup(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
    try {
        const backup = {};
        const tables = ['patients', 'specialists', 'staff', 'administrators', 'readings', 'foodActivityLogs', 'feedback', 'alerts', 'thresholdSettings', 'reports', 'auditLogs', 'emailTemplates'];
        
        for (const t of tables) {
            backup[t] = await db.find(t);
        }
        res.json({ ok: true, backup, timestamp: new Date().toISOString() });
    } catch (e) { res.status(500).json({error:e.message}); }
}

async function restoreBackup(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
    try {
        const { backup } = req.body;
        if (!backup || !backup.patients) return res.status(400).json({error:'Invalid backup file'});

        // Process each table
        for (const [table, data] of Object.entries(backup)) {
            // 1. Clear Table
            const existing = await db.find(table);
            for (const item of existing) await db.delete(table, { id: item.id });
            
            // 2. Insert Data
            for (const item of data) await db.insert(table, item);
        }

        await db.insert('auditLogs', {
            actorType: 'admin', actorId: req.user.id, actionType: 'system_restore',
            details: 'System restored from backup', createdAt: new Date().toISOString()
        });

        res.json({ ok: true });
    } catch (e) { res.status(500).json({error:e.message}); }
}

module.exports = { createProfessional, getUsers, deleteUser, updateUser, getFullBackup, restoreBackup };