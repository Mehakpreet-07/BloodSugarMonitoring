// Reports and settings routes
const { db } = require('../storage/db');
const { analyzePatterns } = require('../utils/ai');
const { fromMgdL } = require('../utils/helpers');

/**
 * POST /api/reports - Generate a report (admin only)
 */
async function generateReport(req, res) {
  try {
    const { periodStart, periodEnd, reportType = 'monthly' } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Period start and end dates are required' 
      });
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ ok: false, error: 'Invalid date format' });
    }

    // Get all patients
    const allPatients = await db.find('patients');

    // Get all readings in the period
    const allReadings = await db.find('readings');
    const periodReadings = allReadings.filter(r => {
      const readingDate = new Date(r.recordedAt);
      return readingDate >= startDate && readingDate <= endDate;
    });

    // Get active patients (those with readings in the period)
    const activePatientIds = new Set(periodReadings.map(r => r.patientId));
    const activePatients = allPatients.filter(p => activePatientIds.has(p.id));

    // Calculate overall statistics
    const values = periodReadings.map(r => r.valueMgPerdL);
    const avgBloodSugar = values.length > 0 
      ? values.reduce((a, b) => a + b, 0) / values.length 
      : 0;
    const maxBloodSugar = values.length > 0 ? Math.max(...values) : 0;
    const minBloodSugar = values.length > 0 ? Math.min(...values) : 0;

    // Load food/activity logs for AI analysis
    for (const reading of periodReadings) {
      reading.foodActivityLogs = await db.find('foodActivityLogs', { 
        readingId: reading.id 
      });
    }

    // Run AI analysis
    const thresholds = await db.findOne('thresholdSettings', { active: true });
    const analysis = analyzePatterns(periodReadings, thresholds);

    // Create food activity triggers summary
    const foodActivityTriggers = {
      topTriggersHigh: analysis.topTriggersHigh,
      topTriggersLow: analysis.topTriggersLow
    };

    // Create report
    const report = await db.insert('reports', {
      adminId: req.user.id,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      reportType,
      numberOfPatients: activePatients.length,
      avgBloodSugarMg: Math.round(avgBloodSugar * 100) / 100,
      maxBloodSugarMg: Math.round(maxBloodSugar * 100) / 100,
      minBloodSugarMg: Math.round(minBloodSugar * 100) / 100,
      totalReadings: periodReadings.length,
      categoryBreakdown: analysis.summary,
      foodActivityTriggers: JSON.stringify(foodActivityTriggers),
      createdAt: new Date().toISOString()
    });

    // Log audit
    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'report_generated',
      resourceType: 'Report',
      resourceId: report.id,
      details: `Generated ${reportType} report for ${periodStart} to ${periodEnd}`,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      ok: true,
      report: {
        ...report,
        foodActivityTriggers: JSON.parse(report.foodActivityTriggers)
      }
    });

  } catch (err) {
    console.error('Generate report error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to generate report' });
  }
}

/**
 * GET /api/reports - Get all reports (admin only)
 */
async function getReports(req, res) {
  try {
    const reports = await db.find('reports');

    // Sort by creation date, most recent first
    reports.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Parse foodActivityTriggers JSON
    const parsedReports = reports.map(r => ({
      ...r,
      foodActivityTriggers: r.foodActivityTriggers 
        ? JSON.parse(r.foodActivityTriggers) 
        : null
    }));

    return res.status(200).json({ ok: true, reports: parsedReports });

  } catch (err) {
    console.error('Get reports error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get reports' });
  }
}

/**
 * GET /api/reports/:id - Get a specific report
 */
async function getReport(req, res) {
  try {
    const reportId = parseInt(req.params.id);

    const report = await db.findById('reports', reportId);
    if (!report) {
      return res.status(404).json({ ok: false, error: 'Report not found' });
    }

    return res.status(200).json({
      ok: true,
      report: {
        ...report,
        foodActivityTriggers: report.foodActivityTriggers 
          ? JSON.parse(report.foodActivityTriggers) 
          : null
      }
    });

  } catch (err) {
    console.error('Get report error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get report' });
  }
}

/**
 * GET /api/settings/thresholds - Get threshold settings
 */
async function getThresholds(req, res) {
  try {
    const thresholds = await db.find('thresholdSettings');

    return res.status(200).json({ ok: true, thresholds });

  } catch (err) {
    console.error('Get thresholds error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get thresholds' });
  }
}

/**
 * PUT /api/settings/thresholds/:id - Update threshold settings (staff/admin only)
 */
async function updateThresholds(req, res) {
  try {
    const thresholdId = parseInt(req.params.id);
    const { 
      name,
      normalMinMg, 
      normalMaxMg, 
      borderlineMinMg, 
      borderlineMaxMg,
      abnormalMinMg,
      abnormalMaxMg,
      abnormalHighMinMg,
      abnormalHighMaxMg,
      active 
    } = req.body;

    const threshold = await db.findById('thresholdSettings', thresholdId);
    if (!threshold) {
      return res.status(404).json({ ok: false, error: 'Threshold not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (normalMinMg !== undefined) updates.normalMinMg = normalMinMg;
    if (normalMaxMg !== undefined) updates.normalMaxMg = normalMaxMg;
    if (borderlineMinMg !== undefined) updates.borderlineMinMg = borderlineMinMg;
    if (borderlineMaxMg !== undefined) updates.borderlineMaxMg = borderlineMaxMg;
    if (abnormalMinMg !== undefined) updates.abnormalMinMg = abnormalMinMg;
    if (abnormalMaxMg !== undefined) updates.abnormalMaxMg = abnormalMaxMg;
    if (abnormalHighMinMg !== undefined) updates.abnormalHighMinMg = abnormalHighMinMg;
    if (abnormalHighMaxMg !== undefined) updates.abnormalHighMaxMg = abnormalHighMaxMg;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length > 0) {
      await db.updateById('thresholdSettings', thresholdId, updates);

      // Log audit
      await db.insert('auditLogs', {
        actorType: req.user.role,
        actorId: req.user.id,
        actionType: 'threshold_updated',
        resourceType: 'ThresholdSettings',
        resourceId: thresholdId,
        details: `Updated threshold settings`,
        createdAt: new Date().toISOString()
      });
    }

    const updatedThreshold = await db.findById('thresholdSettings', thresholdId);

    return res.status(200).json({ ok: true, threshold: updatedThreshold });

  } catch (err) {
    console.error('Update thresholds error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to update thresholds' });
  }
}

/**
 * POST /api/settings/thresholds - Create new threshold settings (admin only)
 */
async function createThresholds(req, res) {
  try {
    const { 
      name,
      normalMinMg, 
      normalMaxMg, 
      borderlineMinMg, 
      borderlineMaxMg,
      abnormalMinMg,
      abnormalMaxMg,
      abnormalHighMinMg,
      abnormalHighMaxMg
    } = req.body;

    if (!name) {
      return res.status(400).json({ ok: false, error: 'Name is required' });
    }

    const threshold = await db.insert('thresholdSettings', {
      name,
      normalMinMg: normalMinMg || 70,
      normalMaxMg: normalMaxMg || 140,
      borderlineMinMg: borderlineMinMg || 140,
      borderlineMaxMg: borderlineMaxMg || 180,
      abnormalMinMg: abnormalMinMg || 0,
      abnormalMaxMg: abnormalMaxMg || 70,
      abnormalHighMinMg: abnormalHighMinMg || 180,
      abnormalHighMaxMg: abnormalHighMaxMg || 500,
      active: false
    });

    // Log audit
    await db.insert('auditLogs', {
      actorType: req.user.role,
      actorId: req.user.id,
      actionType: 'threshold_created',
      resourceType: 'ThresholdSettings',
      resourceId: threshold.id,
      details: `Created threshold settings: ${name}`,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({ ok: true, threshold });

  } catch (err) {
    console.error('Create thresholds error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to create thresholds' });
  }
}

/**
 * GET /api/audit-logs - Get audit logs (admin only)
 */
async function getAuditLogs(req, res) {
  try {
    const { limit = 100, offset = 0 } = req.query;

    let logs = await db.find('auditLogs');

    // Sort by date, most recent first
    logs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const total = logs.length;
    logs = logs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    return res.status(200).json({
      ok: true,
      logs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (err) {
    console.error('Get audit logs error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get audit logs' });
  }
}

module.exports = {
  generateReport,
  getReports,
  getReport,
  getThresholds,
  updateThresholds,
  createThresholds,
  getAuditLogs
};
