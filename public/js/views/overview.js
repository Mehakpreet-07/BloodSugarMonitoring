// public/js/views/overview.js
import { store } from '../state/store.js';
import { getPatientReadings } from '../api/patients.js';
import { getThresholds } from '../api/settings.js';
import { drawLine } from '../components/chart.js';
import { rowsHtml } from '../components/table.js';
import { fmtDate } from '../utils/dates.js';
import { toDisplay, categorizeByThresholds } from '../utils/units.js';
import { makeAiAdvice, adviceHtml } from '../utils/ai.js';

export async function renderOverview(root){
  const me = store.user || {};

  // Staff and guests see a simple notice. Staff use Dashboard and Patients.
  if (me.role !== 'patient'){
    root.innerHTML = `
      <section class="panel">
        <h2>Overview</h2>
        <p class="muted">
          This page is for patients to review their own readings with AI tips.
          Staff can use Dashboard and Patients.
        </p>
      </section>`;
    return;
  }

  // Patient view
  const patientId = me.patientId;
  const [thr, all] = await Promise.all([
    getThresholds(),
    getPatientReadings(patientId)
  ]);
  const list = all.sort((a,b)=> a.ts - b.ts);

  root.innerHTML = `
    <section class="panel">
      <h2>My Recent Readings</h2>
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
  `;

  if (!list.length) return;

  const withCat = r => ({ ...r, cat: categorizeByThresholds(r.valueMgdl, thr) });

  // Table last 14
  const head = `<thead><tr><th>Date</th><th>Reading</th><th>Category</th></tr></thead>`;
  const body = rowsHtml(
    list.slice(-14).reverse().map(r => [
      fmtDate(r.ts),
      toDisplay(r.valueMgdl, thr.unit),
      `<span class="pill p-${withCat(r).cat}">${withCat(r).cat}</span>`
    ])
  );
  document.getElementById('myTable').innerHTML = head + `<tbody>${body}</tbody>`;

  // Chart last 14
  const pts = list.slice(-14).map(withCat).map(r => ({ x:r.ts, y:r.valueMgdl, cat:r.cat }));
  drawLine('myTrend', pts.length ? pts : [{ x: Date.now(), y: 0, cat: 'Normal' }]);

  // AI tips
  const tips = makeAiAdvice(list, thr);
  document.getElementById('aiBox').innerHTML = adviceHtml(tips);
}
