import { USE_MOCKS } from '../config.js';
import { store } from '../state/store.js';

const base = USE_MOCKS ? 'mock' : '/api';

export async function addReading(payload){
  if (USE_MOCKS) return { ok:true, id: Date.now() };
  
  const r = await fetch(`${base}/readings`, {
    method:'POST',
    headers:{
        'Content-Type':'application/json',
        'x-csrf-token': store.csrfToken
    },
    body: JSON.stringify(payload)
  });
  return r.json();
}

// FIXED: Added this function to handle Edits securely
export async function updateReading(id, payload){
  if (USE_MOCKS) return { ok:true };

  const r = await fetch(`${base}/readings/${id}`, {
    method:'PUT',
    headers:{
        'Content-Type':'application/json',
        'x-csrf-token': store.csrfToken
    },
    body: JSON.stringify(payload)
  });
  return r.json();
}

export async function deleteReading(id){
  if (USE_MOCKS) return { ok:true };

  const r = await fetch(`${base}/readings/${id}`, {
    method: 'DELETE',
    headers:{
        'x-csrf-token': store.csrfToken
    }
  });
  return r.json();
}