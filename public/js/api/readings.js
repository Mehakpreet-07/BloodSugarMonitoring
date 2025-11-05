import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? '/mock' : '/api';

export async function listAlerts(params={}){
  const q = new URLSearchParams(params).toString();
  const url = USE_MOCKS ? `${base}/alerts.json` : `${base}/alerts?${q}`;
  const r = await fetch(url); return r.json();
}
