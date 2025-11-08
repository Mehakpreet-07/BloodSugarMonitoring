import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? 'mock' : '/api';

export async function listPatients(search=''){
  const url = USE_MOCKS ? `${base}/patients.json`
                        : `${base}/patients?search=${encodeURIComponent(search)}`;
  const r = await fetch(url); if(!r.ok) throw new Error('patients fetch failed');
  let data = await r.json();
  if (search) data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return data;
}

export async function getPatientReadings(id, params={}){
  if (USE_MOCKS){
    const r = await fetch(`${base}/readings.json`);
    const all = await r.json();
    return all.filter(x => String(x.patientId) === String(id));
  }
  const q = new URLSearchParams(params).toString();
  const r = await fetch(`/api/patients/${id}/readings?${q}`);
  return r.json();
}
