// server/routes/alerts.js
const { db } = require('../storage/db');

async function getAlerts(req, res) {
  try {
    // SECURITY FIX: Staff cannot view Alerts (Medical Data)
    if (req.user.role === 'staff') {
        return res.status(403).json({ ok: false, error: 'Access Forbidden: Staff cannot view medical alerts.' });
    }

    let alerts;

    if (req.user.role === 'patient') {
      alerts = await db.find('alerts', { patientId: req.user.patientId });
    } else if (req.user.role === 'specialist') {
      const { patientId } = req.query;
      if (patientId) {
        alerts = await db.find('alerts', { patientId: parseInt(patientId) });
      } else {
        alerts = await db.find('alerts', { specialistId: req.user.id });
      }
    } else {
      // Admin sees all
      alerts = await db.find('alerts');
    }

    // Sort newest first
    alerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());

    for (const alert of alerts) {
      const patient = await db.findById('patients', alert.patientId);
      if (patient) alert.patientName = patient.fullName;
    }

    return res.status(200).json({ ok: true, alerts });

  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to get alerts' });
  }
}

async function updateAlert(req, res) {
  try {
    const alertId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['Sent', 'Pending', 'Acknowledged'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const alert = await db.findById('alerts', alertId);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    if (req.user.role === 'patient' && alert.patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    await db.updateById('alerts', alertId, { status });

    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'alert_updated',
      resourceType: 'Alert',
      resourceId: alertId,
      details: `Updated alert status to ${status}`,
      createdAt: new Date().toISOString()
    });

    const updatedAlert = await db.findById('alerts', alertId);
    return res.status(200).json({ ok: true, alert: updatedAlert });

  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to update alert' });
  }
}

async function getFeedback(req, res) {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ ok: false, error: 'Patient ID required' });

    // Staff Privacy Check
    if (req.user.role === 'staff') return res.status(403).json({ ok: false, error: 'Access Forbidden' });

    const patientIdInt = parseInt(patientId);
    if (req.user.role === 'patient' && patientIdInt !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const feedback = await db.find('feedback', { patientId: patientIdInt });
    feedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const item of feedback) {
      const specialist = await db.findById('specialists', item.specialistId);
      if (specialist) item.specialistName = specialist.fullName;
    }

    return res.status(200).json({ ok: true, feedback });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to get feedback' });
  }
}

async function createFeedback(req, res) {
  try {
    const { patientId, comment, language } = req.body;
    if (!patientId || !comment) return res.status(400).json({ ok: false, error: 'Required fields missing' });

    if (req.user.role !== 'specialist' && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const feedback = await db.insert('feedback', {
      patientId: parseInt(patientId),
      specialistId: req.user.id,
      comment,
      language: language || 'en',
      createdAt: new Date().toISOString()
    });

    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'feedback_created',
      resourceType: 'Feedback',
      resourceId: feedback.id,
      details: `Created feedback for patient ${patientId}`,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({ ok: true, feedback });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to create feedback' });
  }
}

async function deleteFeedback(req, res) {
  try {
    const feedbackId = parseInt(req.params.id);
    const feedback = await db.findById('feedback', feedbackId);
    if (!feedback) return res.status(404).json({ ok: false, error: 'Not found' });

    if (req.user.role !== 'admin' && feedback.specialistId !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    await db.deleteById('feedback', feedbackId);

    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'feedback_deleted',
      resourceType: 'Feedback',
      resourceId: feedbackId,
      details: `Deleted feedback ${feedbackId}`,
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to delete feedback' });
  }
}

module.exports = { getAlerts, updateAlert, getFeedback, createFeedback, deleteFeedback };