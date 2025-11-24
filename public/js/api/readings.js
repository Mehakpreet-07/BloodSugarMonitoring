import { USE_MOCKS } from '../config.js';
import { store } from '../state/store.js'; // Import store to get token

const base = USE_MOCKS ? 'mock' : '/api';

export async function addReading(payload){
  if (USE_MOCKS) return { ok:true, id: Date.now() };
  
  const r = await fetch(`${base}/readings`, {
    method:'POST',
    headers:{
        'Content-Type':'application/json',
        'x-csrf-token': store.csrfToken // Send the security key
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
        'x-csrf-token': store.csrfToken // Send the security key
    }
  });
  return r.json();
}