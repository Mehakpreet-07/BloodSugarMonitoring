// public/js/views/overview.js
import { store } from '../state/store.js';
import { getPatientReadings } from '../api/patients.js';
import { getThresholds } from '../api/settings.js';
import { addReading } from '../api/readings.js';
import { drawLine } from '../components/chart.js';
import { rowsHtml } from '../components/table.js';
import { fmtDate } from '../utils/dates.js';
import { toDisplay, categorizeByThresholds } from '../utils/units.js';
import { makeAiAdvice, adviceHtml } from '../utils/ai.js';
// this function will render the overview page for patients to review their own readings with AI tips
export async function renderOverview(root){
  const me = store.user || {};

// if the user is not a patient , show a message
  if (me.role !== 'patient'){
    root.innerHTML = `
      <section class="panel">
        <h2>Overview</h2>
        <p class="muted">
          This page is for patients to review their own readings with AI tips.
          Please use Dashboard and Patients for clinical workflows.
        </p>
      </section>`;
    return;
  }

// for patient users , show their recent readings with AI tips

  const patientId = me.patientId;
  const [thr, all] = await Promise.all([
    getThresholds(),
    getPatientReadings(patientId)
  ]);

  let list = all.slice().sort((a,b)=> a.ts - b.ts);

  root.innerHTML = `
    <section class="panel">
      <h2>My Recent Readings</h2>

      <div class="tools" style="margin-bottom:.5rem">
        <label style="font-size:.9rem">
          Range
          <select id="rangeSel">
            <option value="7">Last 7</option>
            <option value="14">Last 14</option>
            <option value="30">Last 30</option>
            <option value="all">All</option>
          </select>
        </label>
        <label style="font-size:.9rem">
          Category
          <select id="catSel">
            <option value="">All</option>
            <option value="Normal">Normal</option>
            <option value="Borderline">Borderline</option>
            <option value="Abnormal">Abnormal</option>
          </select>
        </label>
      </div>

      <canvas id="myTrend" style="height:260px"></canvas>
      <details class="muted" style="margin-top:.5rem">
        <summary>Show data table</summary>
        <table class="list" id="myTable"></table>
      </details>
      <p id="empty" class="muted" style="display:${list.length ? 'none' : 'block'}">No readings yet.</p>
    </section>

    <section class="grid" style="grid-template-columns:1fr 1fr; gap:1rem">
      <div class="panel">
        <h3>AI Advice</h3>
        <div id="aiBox" class="muted" style="margin-top:.6rem"></div>
      </div>
      <div class="panel">
        <h3>About your thresholds</h3>
        <p class="muted" style="margin-top:.6rem">
          Normal up to <strong>${thr.normalMax}</strong> mg/dL,
          Borderline up to <strong>${thr.borderlineMax}</strong> mg/dL.
          Display unit: <strong>${thr.unit === 'mmol' ? 'mmol/L' : 'mg/dL'}</strong>.
        </p>
      </div>
    </section>

    <section class="panel" style="margin-top:1rem">
      <h3>Add new reading</h3>
      <form id="addForm" class="tools" style="margin-top:.5rem">
        <input id="val" type="number" placeholder="mg/dL" min="0" required>
        <input id="note" placeholder="Note about food, activity, or symptoms (optional)">
        <button class="primary" type="submit">Add</button>
      </form>
      <p class="muted" style="margin-top:.4rem">
        Readings are automatically categorized as Normal, Borderline, or Abnormal
        using your current thresholds.
      </p>
      <p id="addMsg" class="muted" style="margin-top:.2rem"></p>
    </section>
  `;
// if there are no readings , stop here
  if (!list.length) return;

  const withCat = r => ({ ...r, cat: categorizeByThresholds(r.valueMgdl, thr) });

// this is for the data table of last 14 readings
  const head = `<thead><tr><th>Date</th><th>Reading</th><th>Category</th></tr></thead>`;
  const body = rowsHtml(
    list.slice(-14).reverse().map(r => [
      fmtDate(r.ts),
      toDisplay(r.valueMgdl, thr.unit),
      { html: `<span class="pill p-${withCat(r).cat}">${withCat(r).cat}</span>` }
    ])
  );
  document.getElementById('myTable').innerHTML = head + `<tbody>${body}</tbody>`;

// this is for the trend chart of last 14 readings
  const pts = list.slice(-14).map(withCat).map(r => ({ x:r.ts, y:r.valueMgdl, cat:r.cat }));
  drawLine('myTrend', pts.length ? pts : [{ x: Date.now(), y: 0, cat: 'Normal' }]);

// patient will get the AI advice based on their readings
  const tips = makeAiAdvice(list, thr);
  document.getElementById('aiBox').innerHTML = adviceHtml(tips);

  // Add reading form wiring
  function wireAddForm(){
    const form   = root.querySelector('#addForm');
    const valEl  = root.querySelector('#val');
    const noteEl = root.querySelector('#note');
    const msgEl  = root.querySelector('#addMsg');

    form.onsubmit = async e => {
      e.preventDefault();
      msgEl.textContent = '';

      const v = Number(valEl.value);
      if (Number.isNaN(v) || v < 0) {
        msgEl.textContent = 'Please enter a valid value.';
        return;
      }

      const payload = {
        patientId,
        ts: Date.now(),
        valueMgdl: v,
        note: noteEl.value?.trim() || ''
      };

      const res = await addReading(payload);
      if (!res || res.ok !== true) {
        msgEl.textContent = 'Could not save reading.';
        return;
      }

      // For mocks we just push it; for real backend you may want to use res.id
      list = list.concat({ id: res.id || Date.now(), ...payload }).sort((a,b)=>a.ts - b.ts);

      valEl.value = '';
      noteEl.value = '';
      msgEl.textContent = 'Saved ✓';

      // Reapply filters with updated data
      applyFilters();

      // Update AI advice as well
      const tips2 = makeAiAdvice(list, thr);
      document.getElementById('aiBox').innerHTML = adviceHtml(tips2);
    };
  }

  wireAddForm();
}
