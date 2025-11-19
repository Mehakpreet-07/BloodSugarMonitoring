// Alerts and feedback routes
const { db } = require('../storage/db');

/**
 * GET /api/alerts - Get alerts
 */
async function getAlerts(req, res) {
  try {
    let alerts;

    if (req.user.role === 'patient') {
      // Patients see their own alerts
      alerts = await db.find('alerts', { patientId: req.user.patientId });
    } else if (req.user.role === 'specialist') {
      // Specialists see alerts for their assigned patients
      // For now, get all alerts (in full implementation, filter by assignment)
      const { patientId } = req.query;
      if (patientId) {
        alerts = await db.find('alerts', { patientId: parseInt(patientId) });
      } else {
        alerts = await db.find('alerts', { specialistId: req.user.id });
      }
    } else {
      // Admin and staff see all alerts
      alerts = await db.find('alerts');
    }

    // Sort by triggered date, most recent first
    alerts.sort((a, b) => 
      new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );

    // Load patient names
    for (const alert of alerts) {
      const patient = await db.findById('patients', alert.patientId);
      if (patient) {
        alert.patientName = patient.fullName;
      }
    }

    return res.status(200).json({ ok: true, alerts });

  } catch (err) {
    console.error('Get alerts error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get alerts' });
  }
}

/**
 * PUT /api/alerts/:id - Update alert status
 */
async function updateAlert(req, res) {
  try {
    const alertId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['Sent', 'Pending', 'Acknowledged'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const alert = await db.findById('alerts', alertId);
    if (!alert) {
      return res.status(404).json({ ok: false, error: 'Alert not found' });
    }

    // Authorization check
    if (req.user.role === 'patient' && alert.patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    await db.updateById('alerts', alertId, { status });

    // Log audit
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
    console.error('Update alert error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update alert' });
  }
}

/**
 * GET /api/feedback - Get feedback for a patient
 */
async function getFeedback(req, res) {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ ok: false, error: 'Patient ID required' });
    }

    const patientIdInt = parseInt(patientId);

    // Authorization check
    if (req.user.role === 'patient' && patientIdInt !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const feedback = await db.find('feedback', { patientId: patientIdInt });

    // Sort by date, most recent first
    feedback.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Load specialist names
    for (const item of feedback) {
      const specialist = await db.findById('specialists', item.specialistId);
      if (specialist) {
        item.specialistName = specialist.fullName;
      }
    }

    return res.status(200).json({ ok: true, feedback });

  } catch (err) {
    console.error('Get feedback error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get feedback' });
  }
}

/**
 * POST /api/feedback - Create feedback (specialist only)
 */
async function createFeedback(req, res) {
  try {
    const { patientId, comment, language } = req.body;

    if (!patientId || !comment) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Patient ID and comment are required' 
      });
    }

    // Check if patient exists
    const patient = await db.findById('patients', parseInt(patientId));
    if (!patient) {
      return res.status(404).json({ ok: false, error: 'Patient not found' });
    }

    const feedback = await db.insert('feedback', {
      patientId: parseInt(patientId),
      specialistId: req.user.id,
      comment,
      language: language || 'en',
      createdAt: new Date().toISOString()
    });

    // Log audit
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
    console.error('Create feedback error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to create feedback' });
  }
}

/**
 * DELETE /api/feedback/:id - Delete feedback
 */
async function deleteFeedback(req, res) {
  try {
    const feedbackId = parseInt(req.params.id);

    const feedback = await db.findById('feedback', feedbackId);
    if (!feedback) {
      return res.status(404).json({ ok: false, error: 'Feedback not found' });
    }

    // Only the specialist who created it or admin can delete
    if (req.user.role !== 'admin' && feedback.specialistId !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    await db.deleteById('feedback', feedbackId);

    // Log audit
    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'feedback_deleted',
      resourceType: 'Feedback',
      resourceId: feedbackId,
      details: `Deleted feedback ${feedbackId}`,
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({ ok: true, message: 'Feedback deleted successfully' });

  } catch (err) {
    console.error('Delete feedback error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to delete feedback' });
  }
}

module.exports = {
  getAlerts,
  updateAlert,
  getFeedback,
  createFeedback,
  deleteFeedback
};
