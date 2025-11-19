// public/js/api/templates.js
//functionality to get and save email templates for blood sugar monitoring application
// templates include account activation, high reading alerts, and weekly summaries
import { USE_MOCKS } from '../config.js';

const base = USE_MOCKS ? 'mock' : '/api';
const LS_KEY = 'bs_email_templates_v1';

const DEFAULTS = [
  {
    id: 'activation',
    name: 'Account activation',
    subject: 'Activate your Blood Sugar account',
    body: 'Hello {{name}},\n\nWelcome to Blood Sugar. Please click the link below to activate your account:\n\n{{activation_link}}\n\nIf you did not request this, you can ignore this email.'
  },
  {
    id: 'high_alert',
    name: 'High reading alert',
    subject: 'Important: A recent blood sugar reading is high',
    body: 'Hello {{name}},\n\nOur system detected a high blood sugar reading of {{value}} recorded at {{timestamp}}.\n\nPlease follow your care plan and contact your specialist if you feel unwell.'
  },
  {
    id: 'weekly_summary',
    name: 'Weekly summary',
    subject: 'Your weekly Blood Sugar summary',
    body: 'Hello {{name}},\n\nHere is a short view of your last week:\n- Normal readings: {{normal_count}}\n- Borderline: {{borderline_count}}\n- Abnormal: {{abnormal_count}}\n\nLog in to review details and any advice from your care team.'
  }
];

function readLocal(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocal(templates){
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(templates));
  } catch {
<<<<<<< HEAD
    // ignore
=======
    // ignore localStorage errors
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
  }
}

// Load templates
export async function getTemplates(){
  // 1. localStorage
  const cached = readLocal();
  if (cached && Array.isArray(cached) && cached.length) return cached;

  // 2. mock file or real api
  try {
    if (USE_MOCKS) {
      const res = await fetch(`${base}/emailTemplates.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error('templates fetch failed');
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        writeLocal(data);
        return data;
      }
      writeLocal(DEFAULTS);
      return DEFAULTS;
    } else {
      const res = await fetch(`/api/email-templates`, { credentials: 'include' });
      if (!res.ok) throw new Error('templates fetch failed');
      const data = await res.json();
      writeLocal(data);
      return data;
    }
  } catch {
    writeLocal(DEFAULTS);
    return DEFAULTS;
  }
}

// Save all templates at once
export async function saveTemplates(list){
  writeLocal(list);
  if (!USE_MOCKS) {
    await fetch(`/api/email-templates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(list)
    });
  }
  return { ok: true };
}
