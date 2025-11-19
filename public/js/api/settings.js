import { USE_MOCKS } from '../config.js';

const base = USE_MOCKS ? 'mock' : '/api';
const LS_KEY = 'bs_thresholds_v1';
const DEFAULTS = { normalMax: 140, borderlineMax: 180, unit: 'mgdl' };

async function safeJson(res, context = '') {
  if (!res.ok) {
    throw new Error(`[settings] ${context} HTTP ${res.status} (${res.url})`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error(`[settings] ${context} invalid JSON from ${res.url}`);
  }
}

export async function getThresholds() {
  try {
    const cached = localStorage.getItem(LS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  try {
    if (USE_MOCKS) {
      const r = await fetch(`${base}/settings.json`, { cache: 'no-store' });
      const data = await safeJson(r, 'getThresholds');
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {}
      return data;
    } else {
      const r = await fetch(`/api/settings/thresholds`, { credentials: 'include' });
      const json = await safeJson(r, 'getThresholds');
      
      if (json.thresholds && Array.isArray(json.thresholds) && json.thresholds.length > 0) {
        return json.thresholds[0];
      }
      return DEFAULTS;
    }
  } catch (e) {
    console.warn(e.message);
    return DEFAULTS;
  }
}

export async function putThresholds(payload) {
  const clean = {
    normalMax: Number(payload.normalMax),
    borderlineMax: Number(payload.borderlineMax),
    unit: payload.unit === 'mmol' ? 'mmol' : 'mgdl'
  };

  if (!(clean.normalMax >= 0) || !(clean.borderlineMax > clean.normalMax)) {
    throw new Error('[settings] Validation failed: borderlineMax must be > normalMax, both ≥ 0');
  }

  try {
    if (USE_MOCKS) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(clean)); } catch (_) {}
      document.dispatchEvent(new CustomEvent('settings:thresholdsChanged', { detail: clean }));
      return { ok: true, ...clean };
    } else {
      const r = await fetch(`/api/settings/thresholds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(clean)
      });
      const data = await safeJson(r, 'putThresholds');
      document.dispatchEvent(new CustomEvent('settings:thresholdsChanged', { detail: data }));
      return data;
    }
  } catch (e) {
    console.warn(e.message);
    throw e;
  }
}