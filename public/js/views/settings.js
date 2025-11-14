import { getThresholds, putThresholds } from '../api/settings.js';

export async function renderSettings(root){
  const t = await getThresholds();
  root.innerHTML = `
    <section class="panel">
      <h2>Settings</h2>
      <h3 style="margin-top:.5rem">Thresholds & Units</h3>
      <form id="thrForm">
        <div class="tools">
          <label>Normal max
            <input id="normalMax" type="number" min="0" required value="${t.normalMax}">
          </label>
          <label>Borderline max
            <input id="borderlineMax" type="number" min="0" required value="${t.borderlineMax}">
          </label>
          <label>Units
            <select id="unit">
              <option value="mgdl" ${t.unit==='mgdl'?'selected':''}>mg/dL</option>
              <option value="mmol" ${t.unit==='mmol'?'selected':''}>mmol/L</option>
            </select>
          </label>
          <button class="primary" type="submit">Save</button>
        </div>
        <p id="err" class="muted" role="alert" aria-live="polite"></p>
      </form>
      <p class="muted" style="margin-top:.5rem">
        Readings ≤ <strong>Normal max</strong> are <span class="pill p-Normal">Normal</span>;
        between Normal and <strong>Borderline max</strong> are <span class="pill p-Borderline">Borderline</span>;
        above Borderline max are <span class="pill p-Abnormal">Abnormal</span>.
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
    const unit = el('unit').value;

    if (Number.isNaN(normalMax) || Number.isNaN(borderlineMax) || normalMax < 0 || borderlineMax < 0){
      err.textContent = 'Values must be non-negative numbers.'; return;
    }
    if (normalMax >= borderlineMax){
      err.textContent = 'Borderline max must be greater than Normal max.'; return;
    }

    await putThresholds({ normalMax, borderlineMax, unit });
    err.textContent = 'Saved ✓';
  };
}
