const { db } = require('../storage/db');
const { toMgdL, fromMgdL, validateBloodSugarValue, isValidUnit, formatTimestamp } = require('../utils/helpers');
const { categorizeReading, shouldTriggerAlert } = require('../utils/ai');
const { sendAbnormalReadingAlertEmails } = require('../utils/notifications');

async function getReadings(req, res) {
  try {
    const patientId = req.user.role === 'patient' ? req.user.patientId : parseInt(req.query.patientId);
    if (!patientId) return res.status(400).json({ ok: false, error: 'Patient ID required' });
    if (req.user.role === 'patient' && patientId !== req.user.patientId) return res.status(403).json({ ok: false, error: 'Access forbidden' });

    const { startDate, endDate, category, limit = 1000, offset = 0 } = req.query;
    const query = { patientId };
    if (category) query.category = category;

    let readings = await db.find('readings', query);

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Date.now();
      readings = readings.filter(r => {
        const timestamp = new Date(r.recordedAt).getTime();
        return timestamp >= start && timestamp <= end;
      });
    }

    readings.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    const total = readings.length;
    readings = readings.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    for (const reading of readings) {
      reading.foodActivityLogs = await db.find('foodActivityLogs', { readingId: reading.id });
    }

    const patient = await db.findById('patients', patientId);
    const preferredUnit = patient?.preferredUnit || 'mg/dL';

    const convertedReadings = readings.map(r => ({
      ...r,
      value: fromMgdL(r.valueMgPerdL, preferredUnit),
      unit: preferredUnit
    }));

    return res.status(200).json({ ok: true, readings: convertedReadings, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('Get readings error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get readings' });
  }
}

async function createReading(req, res) {
  try {
    const { value, unit, notes, foodActivity, recordedAt } = req.body;
    const patientId = req.user.role === 'patient' ? req.user.patientId : parseInt(req.body.patientId);

    if (!patientId) return res.status(400).json({ ok: false, error: 'Patient ID required' });
    if (req.user.role === 'patient' && patientId !== req.user.patientId) return res.status(403).json({ ok: false, error: 'Access forbidden' });
    if (value === undefined || value === null) return res.status(400).json({ ok: false, error: 'Value is required' });
    if (!isValidUnit(unit)) return res.status(400).json({ ok: false, error: 'Invalid unit' });

    const validation = validateBloodSugarValue(parseFloat(value), unit);
    if (!validation.valid) return res.status(400).json({ ok: false, error: validation.error });

    const valueMgPerdL = toMgdL(parseFloat(value), unit);
    const thresholds = await db.findOne('thresholdSettings', { active: true });
    if (!thresholds) return res.status(500).json({ ok: false, error: 'Threshold settings not configured' });

    const category = categorizeReading(valueMgPerdL, thresholds);

    const reading = await db.insert('readings', {
      patientId,
      valueMgPerdL,
      unitEntered: unit,
      category,
      notes: notes || null,
      recordedAt: formatTimestamp(recordedAt || new Date())
    });

    if (foodActivity && Array.isArray(foodActivity) && foodActivity.length > 0) {
      for (const activity of foodActivity) {
        if (activity.description) {
          await db.insert('foodActivityLogs', {
            readingId: reading.id,
            description: activity.description,
            loggedAt: formatTimestamp(activity.time || recordedAt || new Date())
          });
        }
      }
    }

    // Alert Logic Check
    const patientReadings = await db.find('readings', { patientId });
    if (shouldTriggerAlert(patientReadings, thresholds)) {
      const existingAlert = await db.findOne('alerts', { patientId, status: 'Pending' });
      
      if (!existingAlert) {
          const patient = await db.findById('patients', patientId);
          let specialist = null;
          if (patient && patient.specialistId) {
            specialist = await db.findById('specialists', patient.specialistId);
          }

          const alert = await db.insert('alerts', {
            patientId,
            specialistId: specialist ? specialist.id : null,
            triggeredAt: new Date().toISOString(),
            reason: 'More than 3 abnormal readings in the past 7 days',
            status: 'Pending'
          });

          await sendAbnormalReadingAlertEmails({ patient, specialist, reading, alert, thresholds });
      }
    }

    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'reading_created',
      resourceType: 'Reading',
      resourceId: reading.id,
      details: `Created reading: ${valueMgPerdL} mg/dL (${category})`,
      createdAt: new Date().toISOString()
    });

    reading.foodActivityLogs = await db.find('foodActivityLogs', { readingId: reading.id });

    return res.status(201).json({
      ok: true,
      reading: { ...reading, value: fromMgdL(reading.valueMgPerdL, unit), unit }
    });
  } catch (err) {
    console.error('Create reading error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to create reading' });
  }
}

async function updateReading(req, res) {
  try {
    const readingId = parseInt(req.params.id);
    const { value, unit, notes, foodActivity } = req.body;

    const reading = await db.findById('readings', readingId);
    if (!reading) return res.status(404).json({ ok: false, error: 'Reading not found' });
    if (req.user.role === 'patient' && reading.patientId !== req.user.patientId) return res.status(403).json({ ok: false, error: 'Access forbidden' });

    const updates = {};
    if (value !== undefined && unit !== undefined) {
      const validation = validateBloodSugarValue(parseFloat(value), unit);
      if (!validation.valid) return res.status(400).json({ ok: false, error: validation.error });

      const valueMgPerdL = toMgdL(parseFloat(value), unit);
      updates.valueMgPerdL = valueMgPerdL;
      updates.unitEntered = unit;
      const thresholds = await db.findOne('thresholdSettings', { active: true });
      updates.category = categorizeReading(valueMgPerdL, thresholds);
    }
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length > 0) await db.updateById('readings', readingId, updates);

    if (foodActivity !== undefined) {
      await db.delete('foodActivityLogs', { readingId });
      if (Array.isArray(foodActivity)) {
        for (const activity of foodActivity) {
          if (activity.description) {
            await db.insert('foodActivityLogs', {
              readingId,
              description: activity.description,
              loggedAt: formatTimestamp(activity.time || new Date())
            });
          }
        }
      }
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

    const updatedReading = await db.findById('readings', readingId);
    updatedReading.foodActivityLogs = await db.find('foodActivityLogs', { readingId });
    const patient = await db.findById('patients', updatedReading.patientId);
    const preferredUnit = patient?.preferredUnit || 'mg/dL';

    return res.status(200).json({
      ok: true,
      reading: { ...updatedReading, value: fromMgdL(updatedReading.valueMgPerdL, preferredUnit), unit: preferredUnit }
    });
  } catch (err) {
    console.error('Update reading error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update reading' });
  }
}

async function deleteReading(req, res) {
  try {
    const readingId = parseInt(req.params.id);
    const reading = await db.findById('readings', readingId);
    if (!reading) return res.status(404).json({ ok: false, error: 'Reading not found' });
    if (req.user.role === 'patient' && reading.patientId !== req.user.patientId) return res.status(403).json({ ok: false, error: 'Access forbidden' });

    await db.delete('foodActivityLogs', { readingId });
    await db.deleteById('readings', readingId);

    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'reading_deleted',
      resourceType: 'Reading',
      resourceId: readingId,
      details: `Deleted reading ${readingId}`,
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({ ok: true, message: 'Reading deleted successfully' });
  } catch (err) {
    console.error('Delete reading error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to delete reading' });
  }
}

module.exports = { getReadings, createReading, updateReading, deleteReading };