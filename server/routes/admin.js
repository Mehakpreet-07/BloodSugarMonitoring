// server/routes/admin.js
const { db } = require('../storage/db');
const { hashPassword } = require('../utils/security');

async function createProfessional(req, res) {
    try {
        const { fullName, email, password, phone, role, workingID, specialization } = req.body;
        
        // Security Check
        if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});

        const table = role === 'specialist' ? 'specialists' : 'staff';
        const passwordHash = await hashPassword(password);

        await db.insert(table, {
            fullName, email, phone, workingID,
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
    
    // Combine all users into one list for the admin view
    const all = [
        ...a.map(u => ({...u, role: 'admin'})),
        ...p.map(u => ({...u, role: 'patient'})),
        ...s.map(u => ({...u, role: 'specialist'})),
        ...st.map(u => ({...u, role: 'staff'}))
    ];
    
    res.json({ users: all });
}

async function deleteUser(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({error:'Admin only'});
    const { id, role } = req.params;
    
    // Determine which table to delete from
    let table = '';
    if (role === 'patient') table = 'patients';
    else if (role === 'specialist') table = 'specialists';
    else if (role === 'staff') table = 'staff';
    else if (role === 'admin') table = 'administrators';

    if (!table) return res.status(400).json({ error: 'Invalid role' });

    await db.deleteById(table, parseInt(id));
    
    // Log it
    await db.insert('auditLogs', {
        actorType: 'admin',
        actorId: req.user.id,
        actionType: 'user_deleted',
        details: `Deleted user ${id} (${role})`,
        createdAt: new Date().toISOString()
    });

    res.json({ ok: true });
}

module.exports = { createProfessional, getUsers, deleteUser };