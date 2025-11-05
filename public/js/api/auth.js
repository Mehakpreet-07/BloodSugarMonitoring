import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? '/mock' : '/api';

export async function me(){
  if (USE_MOCKS) return { user:{ role:'doctor', name:'Dr. A. Sharma' } };
  const r = await fetch(`${base}/me`); return r.json();
}
