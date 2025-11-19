import { store } from '../state/store.js';
import { getPatientReadings } from '../api/patients.js';
import { getThresholds } from '../api/settings.js';
import { addReading } from '../api/readings.js';
import { drawLine } from '../components/chart.js';
import { rowsHtml } from '../components/table.js';
import { makeAiAdvice, adviceHtml } from '../utils/ai.js';

const MS_PER_DAY = 86400000;

function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

// Internal helper to fetch feedback
async function getMyFeedback() {
    try {
        const r = await fetch('/api/feedback?patientId=' + store.user.patientId);
        const d = await r.json();
        return d.feedback || [];
    } catch { return []; }
}

export async function renderOverview(root){
  const me = store.user || {};

  if (me.role !== 'patient'){
    root.innerHTML = `<section class="panel"><h2>Overview</h2><p class="muted">Patient view only.</p></section>`;
    return;
  }

  const patientId = me.patientId;
  
  // Fetch data + Feedback
  const [thr, allReadings, feedbackList] = await Promise.all([
    getThresholds(),
    getPatientReadings(patientId),
    getMyFeedback()
  ]);

  function getCat(val) {
    if (val <= thr.normalMax) return 'Normal';
    if (val <= thr.borderlineMax) return 'Borderline';
    return 'Abnormal';
  }

  const unitLabel = thr.unit === 'mmol' ? 'mmol/L' : 'mg/dL';
  function displayVal(val) {
     if (thr.unit === 'mmol') return (val * 0.0555).toFixed(1) + ' mmol/L';
     return Math.round(val) + ' mg/dL';
  }

  // Latest feedback message
  const latestFeedback = feedbackList.length > 0 ? feedbackList[0] : null;

  root.innerHTML = `
    <section class="panel">
      <h2>My Recent Readings</h2>
      <div class="tools" style="margin-bottom:.5rem">
        <select id="rangeSel">
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
        <select id="catSel">
          <option value="">All Categories</option>
          <option value="Normal">Normal</option>
          <option value="Borderline">Borderline</option>
          <option value="Abnormal">Abnormal</option>
        </select>
      </div>
      <canvas id="myTrend" style="height:260px"></canvas>
      <details class="muted" style="margin-top:.5rem" open>
        <summary>Show data table</summary>
        <table class="list" id="myTable"></table>
      </details>
      <p id="empty" class="muted" style="display:none; padding:1rem; text-align:center">No readings found.</p>
    </section>

    <div class="panel" style="margin-top:1rem; border-left: 4px solid var(--accent);">
      <h3>Specialist Feedback</h3>
      ${latestFeedback ? `
        <p style="margin-top:0.5rem; font-size:1.1rem">"${latestFeedback.comment}"</p>
        <div class="muted" style="font-size:0.85rem; margin-top:0.5rem">
           — ${latestFeedback.specialistName || 'Specialist'}, ${formatDate(latestFeedback.createdAt)}
        </div>
      ` : `<p class="muted" style="margin-top:0.5rem">No feedback received yet.</p>`}
    </div>

    <section class="grid" style="grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem">
      <div class="panel">
        <h3>AI Insights</h3>
        <div id="aiBox" class="muted" style="margin-top:.6rem"></div>
      </div>
      <div class="panel">
        <h3>Your Thresholds</h3>
        <p class="muted" style="margin-top:.6rem">
          Normal: &le; <strong>${thr.normalMax}</strong><br>
          Borderline: &le; <strong>${thr.borderlineMax}</strong><br>
          Unit: <strong>${unitLabel}</strong>
        </p>
      </div>
    </section>

    <section class="panel" style="margin-top:1rem">
      <h3>Log New Reading</h3>
      <form id="addForm" class="tools" style="margin-top:.5rem">
        <input id="val" type="number" placeholder="Value" min="0" step="0.1" required>
        <input id="note" placeholder="Notes">
        <button class="primary" type="submit">Save</button>
      </form>
      <p id="addMsg" class="muted" style="margin-top:.5rem"></p>
    </section>
  `;

  const rangeSel = root.querySelector('#rangeSel');
  const catSel = root.querySelector('#catSel');
  const tableEl = root.querySelector('#myTable');
  const emptyEl = root.querySelector('#empty');
  const chartEl = 'myTrend'; 

  function render() {
    const rangeVal = rangeSel.value;
    const catVal = catSel.value;
    const now = Date.now();

    let data = allReadings.map(r => ({
        ...r,
        cat: r.cat || getCat(r.valueMgdl),
        ts: new Date(r.ts || r.recordedAt).getTime()
    }));

    if (rangeVal !== 'all') {
      const days = parseInt(rangeVal, 10);
      const cutoff = now - (days * MS_PER_DAY);
      data = data.filter(r => !isNaN(r.ts) && r.ts >= cutoff);
    }
    if (catVal) data = data.filter(r => r.cat === catVal);
    data.sort((a,b) => a.ts - b.ts);

    if (data.length === 0) {
      emptyEl.style.display = 'block';
      tableEl.style.display = 'none';
      drawLine(chartEl, []); 
    } else {
      emptyEl.style.display = 'none';
      tableEl.style.display = 'table';
      drawLine(chartEl, data.map(r => ({ x:r.ts, y:r.valueMgdl, cat:r.cat })));

      const tableRows = data.slice().reverse().map(r => [
        formatDate(r.ts),
        displayVal(r.valueMgdl),
        { html: `<span class="pill p-${r.cat}">${r.cat}</span>` },
        r.notes || r.note || ''
      ]);
      
      const head = `<thead><tr><th>Date</th><th>Value</th><th>Category</th><th>Notes</th></tr></thead>`;
      tableEl.innerHTML = head + `<tbody>${rowsHtml(tableRows)}</tbody>`;
    }

    const recent = allReadings.sort((a,b)=> a.ts - b.ts).slice(-14);
    const tips = makeAiAdvice(recent, thr);
    root.querySelector('#aiBox').innerHTML = adviceHtml(tips);
  }

  rangeSel.onchange = render;
  catSel.onchange = render;
  render();

  const addForm = root.querySelector('#addForm');
  addForm.onsubmit = async (e) => {
    e.preventDefault();
    const msg = root.querySelector('#addMsg');
    msg.textContent = '';

    const valInput = root.querySelector('#val');
    const noteInput = root.querySelector('#note');
    
    let v = parseFloat(valInput.value);
    if (isNaN(v) || v < 0) { msg.textContent = 'Invalid value'; return; }

    const apiUnit = thr.unit === 'mmol' ? 'mmol/L' : 'mg/dL';
    
    const payload = {
      patientId,
      value: v,
      unit: apiUnit,
      notes: noteInput.value.trim(),
      recordedAt: new Date().toISOString()
    };

    const res = await addReading(payload);
    if (!res.ok) {
      msg.textContent = res.error || 'Error saving.';
      return;
    }

    let valMg = v;
    if (apiUnit === 'mmol/L') valMg = Math.round(v * 18);
    
    allReadings.push({ ...payload, id: res.reading?.id || Date.now(), ts: Date.now(), valueMgdl: valMg });
    valInput.value = '';
    noteInput.value = '';
    msg.textContent = 'Saved ✓';
    render();
  };
}