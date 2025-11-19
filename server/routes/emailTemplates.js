const { db } = require('../storage/db');

const DEFAULT_TEMPLATES = [
  {
    type: 'activation',
    name: 'Account activation',
    subject: 'Activate your Blood Sugar account',
    body: 'Hello {{name}},\n\nWelcome to Blood Sugar. Please click the link below to activate your account:\n\n{{activation_link}}\n\nIf you did not request this, you can ignore this email.'
  },
  {
    type: 'high_alert',
    name: 'High reading alert',
    subject: 'Important: A recent blood sugar reading is high',
    body: 'Hello {{name}},\n\nOur system detected a high blood sugar reading of {{value}} recorded at {{timestamp}}.\n\nPlease follow your care plan and contact your specialist if you feel unwell.'
  },
  {
    type: 'weekly_summary',
    name: 'Weekly summary',
    subject: 'Your weekly Blood Sugar summary',
    body: 'Hello {{name}},\n\nHere is a short view of your last week:\n- Normal readings: {{normal_count}}\n- Borderline: {{borderline_count}}\n- Abnormal: {{abnormal_count}}\n\nLog in to review details and any advice from your care team.'
  }
];

async function ensureSeeded() {
  const existing = await db.find('emailTemplates');
  if (!existing.length) {
    for (const tpl of DEFAULT_TEMPLATES) {
      await db.insert('emailTemplates', tpl);
    }
  }
}

async function getEmailTemplates(req, res) {
  try {
    await ensureSeeded();
    const templates = await db.find('emailTemplates');
    return res.status(200).json(templates);
  } catch (err) {
    console.error('Get email templates error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to get email templates' });
  }
}

async function updateEmailTemplates(req, res) {
  try {
    const list = Array.isArray(req.body) ? req.body : [];
    const all = await db.find('emailTemplates');
    for (const tpl of all) await db.deleteById('emailTemplates', tpl.id);
    for (const tpl of list) await db.insert('emailTemplates', tpl);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Update email templates error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to save templates' });
  }
}

module.exports = { getEmailTemplates, updateEmailTemplates };