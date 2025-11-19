// Patient routes
const { db } = require('../storage/db');
const { analyzePatterns, generateInsights } = require('../utils/ai');
const { fromMgdL } = require('../utils/helpers');

/**
 * GET /api/patients - Get all patients (specialists/staff/admin only)
 */
async function getPatients(req, res) {
  try {
    const patients = await db.find('patients');

    // Enhance patient list with last reading info
    const patientList = await Promise.all(patients.map(async p => {
      // Get most recent reading for this patient
      const readings = await db.find('readings', { patientId: p.id });
      
      let lastReading = 'No readings yet';
      let category = 'Unknown';
      
      if (readings && readings.length > 0) {
        // Sort by recordedAt descending to get most recent
        readings.sort((a, b) => 
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
        );
        
        const mostRecent = readings[0];
        
        // Format the date nicely
        const date = new Date(mostRecent.recordedAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) {
          lastReading = 'Just now';
        } else if (diffMins < 60) {
          lastReading = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
          lastReading = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
          lastReading = 'Yesterday';
        } else if (diffDays < 7) {
          lastReading = `${diffDays} days ago`;
        } else {
          lastReading = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
        }
        
        // Determine overall status from last 7 days, not just most recent reading
        const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        const recentReadings = readings.filter(r => 
          new Date(r.recordedAt).getTime() >= sevenDaysAgo
        );
        
        // Count categories in last 7 days
        const abnormalCount = recentReadings.filter(r => 
          r.category === 'AbnormalHigh' || r.category === 'AbnormalLow' || r.category === 'Abnormal'
        ).length;
        const borderlineCount = recentReadings.filter(r => 
          r.category === 'Borderline'
        ).length;
        
        // Determine overall status
        if (abnormalCount >= 3) {
          category = 'Abnormal';
        } else if (abnormalCount >= 1 || borderlineCount >= 3) {
          category = 'Borderline';
        } else if (recentReadings.length > 0) {
          category = 'Normal';
        } else {
          category = mostRecent.category || 'Unknown';
        }
      }
      
      return {
        id: p.id,
        name: p.fullName,
        email: p.email,
        healthCareNumber: p.healthCareNumber,
        registrationDate: p.registrationDate,
        last: lastReading,
        cat: category
      };
    }));

    return res.status(200).json({ ok: true, patients: patientList });

  } catch (err) {
    console.error('Get patients error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get patients' });
  }
}

/**
 * GET /api/patients/:id - Get patient details
 */
async function getPatient(req, res) {
  try {
    const patientId = parseInt(req.params.id);

    // Authorization check
    if (req.user.role === 'patient' && patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const patient = await db.findById('patients', patientId);
    if (!patient) {
      return res.status(404).json({ ok: false, error: 'Patient not found' });
    }

    // Exclude password hash
    const { passwordHash, ...patientData } = patient;

    return res.status(200).json({ ok: true, patient: patientData });

  } catch (err) {
    console.error('Get patient error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get patient' });
  }
}

/**
 * GET /api/patients/:id/dashboard - Get patient dashboard data
 */
async function getPatientDashboard(req, res) {
  try {
    const patientId = parseInt(req.params.id);

    // Authorization check
    if (req.user.role === 'patient' && patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const patient = await db.findById('patients', patientId);
    if (!patient) {
      return res.status(404).json({ ok: false, error: 'Patient not found' });
    }

    // Get all readings
    const allReadings = await db.find('readings', { patientId });

    // Get recent readings (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentReadings = allReadings.filter(r => 
      new Date(r.recordedAt).getTime() >= thirtyDaysAgo
    );

    // Load food/activity logs for recent readings
    for (const reading of recentReadings) {
      reading.foodActivityLogs = await db.find('foodActivityLogs', { readingId: reading.id });
    }

    // Get threshold settings
    const thresholds = await db.findOne('thresholdSettings', { active: true });

    // Calculate statistics
    const stats = calculateStats(recentReadings, patient.preferredUnit || 'mg/dL');

    // Run AI analysis
    const analysis = analyzePatterns(recentReadings, thresholds);
    const insights = generateInsights(analysis);

    // Get recent feedback
    const feedback = await db.aggregate('feedback', [
      { $match: { patientId } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 }
    ]);

    // Get pending alerts
    const alerts = await db.find('alerts', { patientId, status: 'Pending' });

    return res.status(200).json({
      ok: true,
      dashboard: {
        patient: {
          id: patient.id,
          name: patient.fullName,
          email: patient.email,
          preferredUnit: patient.preferredUnit || 'mg/dL'
        },
        stats,
        insights,
        analysis: {
          topTriggersHigh: analysis.topTriggersHigh,
          topTriggersLow: analysis.topTriggersLow,
          summary: analysis.summary
        },
        recentReadings: recentReadings.slice(0, 10).map(r => ({
          ...r,
          value: fromMgdL(r.valueMgPerdL, patient.preferredUnit || 'mg/dL'),
          unit: patient.preferredUnit || 'mg/dL'
        })),
        feedback,
        alerts
      }
    });

  } catch (err) {
    console.error('Get dashboard error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get dashboard data' });
  }
}

/**
 * PUT /api/patients/:id - Update patient profile
 */
async function updatePatient(req, res) {
  try {
    const patientId = parseInt(req.params.id);
    const { fullName, email, phone, dateOfBirth, preferredUnit } = req.body;

    // Authorization check
    if (req.user.role === 'patient' && patientId !== req.user.patientId) {
      return res.status(403).json({ ok: false, error: 'Access forbidden' });
    }

    const patient = await db.findById('patients', patientId);
    if (!patient) {
      return res.status(404).json({ ok: false, error: 'Patient not found' });
    }

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (phone !== undefined) updates.phone = phone;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (preferredUnit !== undefined && (preferredUnit === 'mg/dL' || preferredUnit === 'mmol/L')) {
      updates.preferredUnit = preferredUnit;
    }

    if (Object.keys(updates).length > 0) {
      await db.updateById('patients', patientId, updates);

      // Log audit
      await db.insert('auditLogs', {
        actorType: req.user.role,
        actorId: req.user.id,
        actionType: 'patient_updated',
        resourceType: 'Patient',
        resourceId: patientId,
        details: `Updated patient profile`,
        createdAt: new Date().toISOString()
      });
    }

    const updatedPatient = await db.findById('patients', patientId);
    const { passwordHash, ...patientData } = updatedPatient;

    return res.status(200).json({ ok: true, patient: patientData });

  } catch (err) {
    console.error('Update patient error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update patient' });
  }
}

/**
 * Helper function to calculate statistics
 */
function calculateStats(readings, preferredUnit) {
  if (!readings || readings.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
      byCategory: {
        Normal: 0,
        Borderline: 0,
        AbnormalHigh: 0,
        AbnormalLow: 0
      }
    };
  }

  const values = readings.map(r => r.valueMgPerdL);
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const byCategory = {
    Normal: 0,
    Borderline: 0,
    AbnormalHigh: 0,
    AbnormalLow: 0
  };

  readings.forEach(r => {
    if (r.category === 'Normal') byCategory.Normal++;
    else if (r.category === 'Borderline') byCategory.Borderline++;
    else if (r.category === 'AbnormalHigh') byCategory.AbnormalHigh++;
    else if (r.category === 'AbnormalLow') byCategory.AbnormalLow++;
    else if (r.category === 'Abnormal') {
      // Legacy category - try to determine if high or low
      if (r.valueMgPerdL > 180) byCategory.AbnormalHigh++;
      else byCategory.AbnormalLow++;
    }
  });

  return {
    count: readings.length,
    average: fromMgdL(average, preferredUnit),
    min: fromMgdL(min, preferredUnit),
    max: fromMgdL(max, preferredUnit),
    unit: preferredUnit,
    byCategory
  };
}

module.exports = {
  getPatients,
  getPatient,
  getPatientDashboard,
  updatePatient
};
