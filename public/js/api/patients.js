import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? '/mock' : '/api';

export async function listPatients(search=''){
  const url = USE_MOCKS ? `${base}/patients.json` : `${base}/patients?search=${encodeURIComponent(search)}`;
  const r = await fetch(url); return r.json();
}
export async function getPatientReadings(id, params={}){
  const q = new URLSearchParams(params).toString();
  const url = USE_MOCKS ? `${base}/readings.json` : `${base}/patients/${id}/readings?${q}`;
  const r = await fetch(url); return r.json();
}
