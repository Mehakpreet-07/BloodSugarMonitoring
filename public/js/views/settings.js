// Settings page with real-time threshold updates
import { getThresholds, putThresholds } from '../api/settings.js';
import { store } from '../state/store.js';

export async function renderSettings(root){
  const t = await getThresholds();
  const activeThreshold = Array.isArray(t) ? t.find(th => th.active) || t[0] : t;

  root.innerHTML = `
    <section class="panel">
      <h2>Settings</h2>
      <h3 style="margin-top:.5rem">Thresholds & Units</h3>
      <form id="thrForm">
        <div class="tools">
          <label>Normal max (mg/dL)
            <input id="normalMax" type="number" min="0" required value="${activeThreshold.normalMaxMg || activeThreshold.normalMax}">
          </label>
          <label>Borderline max (mg/dL)
            <input id="borderlineMax" type="number" min="0" required value="${activeThreshold.borderlineMaxMg || activeThreshold.borderlineMax}">
          </label>
          <label>Abnormal Low (<)
            <input id="abnormalMaxMg" type="number" min="0" required value="${activeThreshold.abnormalMaxMg || 70}">
          </label>
          <label>Abnormal High (>)
            <input id="abnormalHighMinMg" type="number" min="0" required value="${activeThreshold.abnormalHighMinMg || 180}">
          </label>
          <button class="primary" type="submit">Save Thresholds</button>
        </div>
        <p id="err" class="muted" role="alert" aria-live="polite"></p>
      </form>
      <p class="muted" style="margin-top:.5rem">
        Readings ≤ <strong id="displayNormal">${activeThreshold.normalMaxMg || activeThreshold.normalMax}</strong> mg/dL are <span class="pill p-Normal">Normal</span>;
        between Normal and <strong id="displayBorderline">${activeThreshold.borderlineMaxMg || activeThreshold.borderlineMax}</strong> mg/dL are <span class="pill p-Borderline">Borderline</span>;
        below <strong id="displayLow">${activeThreshold.abnormalMaxMg || 70}</strong> mg/dL are <span class="pill p-Abnormal">Abnormal Low</span>;
        above <strong id="displayHigh">${activeThreshold.abnormalHighMinMg || 180}</strong> mg/dL are <span class="pill p-Abnormal">Abnormal High</span>.
      </p>
    </section>
  `;

  const el = id => root.querySelector('#'+id);
  const form = el('thrForm'), err = el('err');

  form.onsubmit = async (e)=>{
    e.preventDefault();
    err.textContent = '';
    
    const normalMax = Number(el('normalMax').value);
    const borderlineMax = Number(el('borderlineMax').value);
    const abnormalMaxMg = Number(el('abnormalMaxMg').value);
    const abnormalHighMinMg = Number(el('abnormalHighMinMg').value);

    if (Number.isNaN(normalMax) || Number.isNaN(borderlineMax) || normalMax < 0 || borderlineMax < 0){
      err.textContent = 'Values must be non-negative numbers.'; 
      return;
    }
    if (normalMax >= borderlineMax){
      err.textContent = 'Borderline max must be greater than Normal max.'; 
      return;
    }

    try {
      // Update via API
      const thresholdId = activeThreshold.id || 1;
      await fetch(`/api/settings/thresholds/${thresholdId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': store.csrfToken 
        },
        body: JSON.stringify({ 
          normalMaxMg: normalMax, 
          borderlineMaxMg: borderlineMax,
          abnormalMaxMg,
          abnormalHighMinMg
        })
      });

      // ⭐ Update display immediately
      document.getElementById('displayNormal').textContent = normalMax;
      document.getElementById('displayBorderline').textContent = borderlineMax;
      document.getElementById('displayLow').textContent = abnormalMaxMg;
      document.getElementById('displayHigh').textContent = abnormalHighMinMg;

      err.textContent = 'Saved ✓ (Refresh Overview to see updated categories)';
      err.style.color = 'var(--ok)';

      // ⭐ Trigger global event for other components
      document.dispatchEvent(new CustomEvent('thresholds:changed', {
        detail: { normalMaxMg: normalMax, borderlineMaxMg: borderlineMax, abnormalMaxMg, abnormalHighMinMg }
      }));

    } catch (error) {
      err.textContent = 'Failed to save: ' + error.message;
      err.style.color = 'var(--bad)';
    }
  };
}