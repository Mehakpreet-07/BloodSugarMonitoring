// server/routes/patients.js (Full content)
const { db } = require('../storage/db');
const { analyzePatterns, generateInsights } = require('../utils/ai');
const { fromMgdL } = require('../utils/helpers');

async function getPatients(req, res) {
  try {
    const query = {};
    if (req.user.role === 'specialist') {
        query.assignedSpecialistId = req.user.id;
    }
    // Staff CAN see this list (Demographics only), so no blocking here.

    const patients = await db.find('patients', query);

    const patientList = await Promise.all(patients.map(async p => {
      // Staff shouldn't really see 'lastReading' medical data, but for list view it's often acceptable.
      // If strict compliance needed, hide 'last' and 'cat' for staff.
      const isStaff = req.user.role === 'staff';
      
      const readings = await db.find('readings', { patientId: p.id });
      let lastReading = 'No readings yet';
      let category = 'Unknown';
      
      if (!isStaff && readings && readings.length > 0) {
        readings.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        const mostRecent = readings[0];
        
        const date = new Date(mostRecent.recordedAt);
        const diffDays = Math.floor((new Date() - date) / 86400000);
        lastReading = diffDays === 0 ? 'Today' : `${diffDays} days ago`;
        
        const sevenDaysAgo = Date.now() - (7 * 86400000);
        const recentReadings = readings.filter(r => new Date(r.recordedAt).getTime() >= sevenDaysAgo);
        const abnormalCount = recentReadings.filter(r => r.category && r.category.includes('Abnormal')).length;
        
        if (abnormalCount >= 3) category = 'Abnormal';
        else if (abnormalCount > 0) category = 'Borderline';
        else category = 'Normal';
      } else if (isStaff) {
          lastReading = 'Restricted';
          category = 'Hidden';
      }
      
      return {
        id: p.id,
        name: p.fullName,
        email: p.email,
        healthCareNumber: p.healthCareNumber,
        last: lastReading,
        cat: category
      };
    }));

    return res.status(200).json({ ok: true, patients: patientList });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to get patients' });
  }
}

async function getPatient(req, res) {
  try {
    const patientId = parseInt(req.params.id);
    if (req.user.role === 'patient' && patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }
    const patient = await db.findById('patients', patientId);
    if (!patient) return res.status(404).json({ ok: false, error: 'Patient not found' });
    const { passwordHash, ...patientData } = patient;
    return res.status(200).json({ ok: true, patient: patientData });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to get patient' });
  }
}

async function getPatientDashboard(req, res) {
  try {
    // SRS 3.1.3.a: Block Staff
    if (req.user.role === 'staff') {
        return res.status(403).json({ ok: false, error: 'Staff cannot view patient dashboards' });
    }

    const patientId = parseInt(req.params.id);
    if (req.user.role === 'patient' && patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }
    const patient = await db.findById('patients', patientId);
    if (!patient) return res.status(404).json({ ok: false, error: 'Patient not found' });

    const allReadings = await db.find('readings', { patientId });
    const thirtyDaysAgo = Date.now() - (30 * 86400000);
    const recentReadings = allReadings.filter(r => new Date(r.recordedAt).getTime() >= thirtyDaysAgo);

    const stats = { count: recentReadings.length, unit: patient.preferredUnit || 'mg/dL' }; 
    const thresholds = await db.findOne('thresholdSettings', { active: true });
    const analysis = analyzePatterns(recentReadings, thresholds || { normalMax: 140, abnormalMinMg: 0 }); 
    const insights = generateInsights(analysis);

    return res.status(200).json({
      ok: true,
      dashboard: {
        patient: { id: patient.id, name: patient.fullName },
        stats,
        insights,
        readings: recentReadings
      }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to get dashboard' });
  }
}

async function updatePatient(req, res) {
  try {
    const patientId = parseInt(req.params.id);
    // Allow Patient (Self), Admin, Staff
    if (req.user.role === 'patient' && patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const patient = await db.findById('patients', patientId);
    if (!patient) return res.status(404).json({ ok: false, error: 'Patient not found' });

    const updates = {};
    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.email) updates.email = req.body.email.toLowerCase();
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.dateOfBirth) updates.dateOfBirth = req.body.dateOfBirth;
    if (req.body.preferredUnit) updates.preferredUnit = req.body.preferredUnit;
    if (req.body.assignedSpecialistId !== undefined) updates.assignedSpecialistId = req.body.assignedSpecialistId;

    if (Object.keys(updates).length > 0) {
      await db.updateById('patients', patientId, updates);
      await db.insert('auditLogs', {
        actorType: req.user.role,
        actorId: req.user.id,
        actionType: 'patient_updated',
        resourceType: 'Patient',
        resourceId: patientId,
        details: 'Updated patient profile',
        createdAt: new Date().toISOString()
      });
    }

    const updatedPatient = await db.findById('patients', patientId);
    const { passwordHash, ...patientData } = updatedPatient;
    return res.status(200).json({ ok: true, patient: patientData });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to update patient' });
  }
}

module.exports = { getPatients, getPatient, getPatientDashboard, updatePatient };