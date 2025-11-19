import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? 'mock' : '/api';

export async function listAlerts(params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = USE_MOCKS ? `${base}/alerts.json` : `${base}/alerts?${q}`;
  
  const r = await fetch(url);
  if (!r.ok) throw new Error('alerts fetch failed');
  
  const data = await r.json();
  return data.alerts || []; // Unwraps response
}

export async function listPatientAlerts(patientId){
  const all = await listAlerts();
  return all.filter(a => String(a.patientId) === String(patientId));
}