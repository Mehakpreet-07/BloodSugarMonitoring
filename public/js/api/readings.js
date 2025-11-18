// api/readings.js
//function to add new blood sugar reading API call

import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? 'mock' : '/api';
//adds new blood sugar reading to the server or simulates success if using mocks
export async function addReading(payload){
  // payload: { patientId, ts, valueMgdl, note? }
  if (USE_MOCKS) {
    // simulate success; your view will update local state
    return { ok:true, id: Date.now() };
  }
  const r = await fetch(`${base}/readings`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return r.json();
}
