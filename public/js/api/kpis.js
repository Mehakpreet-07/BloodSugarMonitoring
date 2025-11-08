import { USE_MOCKS } from '../config.js';
const base = USE_MOCKS ? 'mock' : '/api';   // <-- no leading slash when using mocks

export async function getKpis() {
  const r = await fetch(`${base}/kpis${USE_MOCKS ? '.json' : ''}`);
  if (!r.ok) throw new Error('kpis fetch failed');
  return r.json();
}
