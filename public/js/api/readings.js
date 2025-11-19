import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? 'mock' : '/api';

export async function addReading(payload){
  if (USE_MOCKS) return { ok:true, id: Date.now() };
  
  const r = await fetch(`${base}/readings`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return r.json();
}

// This was missing! The error happens because overview.js imports this, but it wasn't here.
export async function deleteReading(id){
  if (USE_MOCKS) return { ok:true };

  const r = await fetch(`${base}/readings/${id}`, {
    method: 'DELETE'
  });
  return r.json();
}