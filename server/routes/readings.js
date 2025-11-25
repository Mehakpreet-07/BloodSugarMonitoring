// server/routes/readings.js
const { db } = require('../storage/db');
const { toMgdL, fromMgdL, validateBloodSugarValue, isValidUnit, formatTimestamp } = require('../utils/helpers');
const { categorizeReading, shouldTriggerAlert } = require('../utils/ai');
const { sendAbnormalReadingAlertEmails } = require('../utils/notifications');

// GET Readings
async function getReadings(req, res) {
  try {
    if (req.user.role === 'staff') {
        return res.status(403).json({ ok: false, error: 'Staff cannot view medical data' });
    }

    const patientId = req.user.role === 'patient' ? req.user.patientId : parseInt(req.query.patientId);
    if (!patientId) return res.status(400).json({ ok: false, error: 'Patient ID required' });
    
    if (req.user.role === 'patient' && patientId !== req.user.patientId) {
        return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const query = { patientId };
    let readings = await db.find('readings', query);
    readings.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

    const patient = await db.findById('patients', patientId);
    const unit = patient?.preferredUnit || 'mg/dL';

    const converted = readings.map(r => ({
        ...r,
        value: fromMgdL(r.valueMgPerdL, unit),
        unit
    }));

    res.json({ ok: true, readings: converted });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// CREATE Reading
async function createReading(req, res) {
  try {
    const { value, unit, foodIntake, eventActivity, symptoms, recordedAt } = req.body;
    const patientId = req.user.role === 'patient' ? req.user.patientId : parseInt(req.body.patientId);

    if (!value) return res.status(400).json({ ok: false, error: 'Value required' });

    const valMg = toMgdL(parseFloat(value), unit);
    const thresholds = await db.findOne('thresholdSettings', { active: true });
    const category = categorizeReading(valMg, thresholds);

    const reading = await db.insert('readings', {
      patientId,
      valueMgPerdL: valMg,
      unitEntered: unit,
      category,
      foodIntake: foodIntake || '',
      eventActivity: eventActivity || '',
      symptoms: symptoms || '',
      recordedAt: formatTimestamp(recordedAt)
    });

    // Alert Logic
    const patientReadings = await db.find('readings', { patientId });
    if (shouldTriggerAlert(patientReadings, thresholds)) {
       const existing = await db.findOne('alerts', { patientId, status: 'Pending' });
       if (!existing) {
           const patient = await db.findById('patients', patientId);
           await db.insert('alerts', {
               patientId,
               specialistId: patient.assignedSpecialistId || null,
               triggeredAt: new Date().toISOString(),
               reason: '>3 Abnormal readings in 7 days',
               status: 'Pending'
           });
       }
    }

    // FIX: Use 'valMg' here instead of 'valueMgPerdL'
    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'reading_created',
      resourceType: 'Reading',
      resourceId: reading.id,
      details: `Created reading: ${valMg} mg/dL (${category})`, 
      createdAt: new Date().toISOString()
    });

    res.json({ ok: true, reading });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

// UPDATE Reading
async function updateReading(req, res) {
  try {
    const readingId = parseInt(req.params.id);
    const { value, unit, foodIntake, eventActivity, symptoms } = req.body;

    const reading = await db.findById('readings', readingId);
    if (!reading) return res.status(404).json({ ok: false, error: 'Not found' });
    
    if (req.user.role === 'patient' && reading.patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const updates = {};
    if (value !== undefined && unit !== undefined) {
      const valMg = toMgdL(parseFloat(value), unit);
      updates.valueMgPerdL = valMg;
      updates.unitEntered = unit;
      const thresholds = await db.findOne('thresholdSettings', { active: true });
      updates.category = categorizeReading(valMg, thresholds);
    }
    
    if (foodIntake !== undefined) updates.foodIntake = foodIntake;
    if (eventActivity !== undefined) updates.eventActivity = eventActivity;
    if (symptoms !== undefined) updates.symptoms = symptoms;

    if (Object.keys(updates).length > 0) {
        await db.updateById('readings', readingId, updates);
    }

    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'reading_updated',
      resourceType: 'Reading',
      resourceId: readingId,
      details: `Updated reading ${readingId}`,
      createdAt: new Date().toISOString()
    });

    const updated = await db.findById('readings', readingId);
    const patient = await db.findById('patients', updated.patientId);
    const prefUnit = patient?.preferredUnit || 'mg/dL';
    
    res.json({ 
        ok: true, 
        reading: { 
            ...updated, 
            value: fromMgdL(updated.valueMgPerdL, prefUnit), 
            unit: prefUnit 
        } 
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// DELETE Reading
async function deleteReading(req, res) {
    try {
        const id = parseInt(req.params.id);
        const r = await db.findById('readings', id);
        if (!r) return res.status(404).json({error:'Not found'});
        
        if (req.user.role === 'patient' && r.patientId !== req.user.patientId) {
            return res.status(403).json({error:'Forbidden'});
        }
        
        await db.deleteById('readings', id);
        
        await db.insert('auditLogs', {
            actorType: req.user.role,
            actorId: req.user.id,
            actionType: 'reading_deleted',
            resourceType: 'Reading',
            resourceId: id,
            details: 'Deleted reading',
            createdAt: new Date().toISOString()
        });

        res.json({ok:true});
    } catch (e) { res.status(500).json({error:e.message}); }
}

module.exports = { getReadings, createReading, updateReading, deleteReading };