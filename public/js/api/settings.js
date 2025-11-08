// public/js/api/settings.js
import { USE_MOCKS } from '../config.js';

// IMPORTANT: when serving /public/index.html with Live Server,
// mock files must be relative: "mock/..." (not "/mock/...")
const base = USE_MOCKS ? 'mock' : '/api';

const LS_KEY = 'bs_thresholds_v1';
const DEFAULTS = { normalMax: 140, borderlineMax: 180, unit: 'mgdl' };

// Safe JSON helper
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
  // 1) cached (mock persists via localStorage)
  try {
    const cached = localStorage.getItem(LS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (_) {
    /* ignore localStorage errors */
  }

  // 2) fetch
  try {
    if (USE_MOCKS) {
      const r = await fetch(`${base}/settings.json`, { cache: 'no-store' });
      const data = await safeJson(r, 'getThresholds');
      try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) {}
      return data;
    } else {
      const r = await fetch(`/api/settings/thresholds`, { credentials: 'include' });
      return await safeJson(r, 'getThresholds');
    }
  } catch (e) {
    console.warn(e.message);
    // 3) final fallback
    return DEFAULTS;
  }
}

export async function putThresholds(payload) {
  // payload: { normalMax:number, borderlineMax:number, unit:'mgdl'|'mmol' }
  const clean = {
    normalMax: Number(payload.normalMax),
    borderlineMax: Number(payload.borderlineMax),
    unit: payload.unit === 'mmol' ? 'mmol' : 'mgdl'
  };

  // basic guard
  if (!(clean.normalMax >= 0) || !(clean.borderlineMax > clean.normalMax)) {
    throw new Error('[settings] Validation failed: borderlineMax must be > normalMax, both ≥ 0');
  }

  try {
    if (USE_MOCKS) {
      // persist locally in mock mode
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

