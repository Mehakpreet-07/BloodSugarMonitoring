// public/js/api/patients.js
import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? 'mock' : '/api';

export async function listPatients(search=''){
  const url = USE_MOCKS ? `${base}/patients.json`
                        : `${base}/patients?search=${encodeURIComponent(search)}`;
  
  const r = await fetch(url); 
  if(!r.ok) throw new Error('patients fetch failed');
  
  const json = await r.json();
  let data = json.patients || []; 
  
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
  
  const json = await r.json();
  const raw = json.readings || [];

  // FIX: Map Backend format -> Frontend format
  // We use 'value' (which the backend guarantees) as a fallback for 'valueMgPerdL'
  return raw.map(reading => ({
    ...reading,
    ts: reading.recordedAt ? new Date(reading.recordedAt).getTime() : Date.now(),
    valueMgdl: reading.valueMgPerdL || reading.value || 0, // Robust fallback
    unit: 'mg/dL' 
  }));
}