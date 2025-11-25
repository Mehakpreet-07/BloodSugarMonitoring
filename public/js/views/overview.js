import { store } from '../state/store.js';
import { getPatientReadings } from '../api/patients.js';
import { getThresholds } from '../api/settings.js';
import { addReading, updateReading, deleteReading } from '../api/readings.js'; // Added updateReading
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
  const [thr, allReadings, feedbackList] = await Promise.all([
    getThresholds(),
    getPatientReadings(patientId),
    getMyFeedback()
  ]);

  const normalMax = thr.normalMax || thr.normalMaxMg || 140;
  const borderlineMax = thr.borderlineMax || thr.borderlineMaxMg || 180;

  // FIX: Use Patient's Preferred Unit from Profile
  const userUnit = me.preferredUnit || 'mg/dL';

  function getCat(val) {
    // Thresholds are in mg/dL, so ensure we compare mg/dL
    if (val <= normalMax) return 'Normal';
    if (val <= borderlineMax) return 'Borderline';
    return 'Abnormal';
  }

  function displayVal(valMg) {
     if (userUnit === 'mmol/L') return (valMg * 0.0555).toFixed(1) + ' mmol/L';
     return Math.round(valMg) + ' mg/dL';
  }

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
      <div style="overflow-x:auto; margin-top:.5rem">
        <table class="list" id="myTable" style="min-width:600px"></table>
      </div>
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
        <h3>Thresholds</h3>
        <p class="muted" style="margin-top:.6rem">
          Normal: &le; <strong>${displayVal(normalMax)}</strong><br>
          Borderline: &le; <strong>${displayVal(borderlineMax)}</strong><br>
          Unit: <strong>${userUnit}</strong>
        </p>
      </div>
    </section>

    <section class="panel" id="formPanel" style="margin-top:1rem; transition: background 0.3s">
      <h3 id="formTitle">Log New Reading</h3>
      <form id="addForm" style="display:grid; gap:1rem; margin-top:1rem">
        <input type="hidden" id="editId" value=""> 
        
        <div class="grid two" style="gap:1rem">
            <input id="val" type="number" placeholder="Value (${userUnit})" min="0" step="0.1" required style="font-size:1.1rem">
            <input id="food" type="text" placeholder="Food Intake (e.g. Pizza)">
        </div>
        <div class="grid two" style="gap:1rem">
            <input id="event" type="text" placeholder="Activity/Event (e.g. Stress)">
            <input id="symp" type="text" placeholder="Symptoms (e.g. Dizzy)">
        </div>
        
        <div class="tools">
            <button class="primary" type="submit" id="saveBtn">Save Log</button>
            <button type="button" id="cancelEdit" style="display:none; background:#f1f1f1; color:#333">Cancel Edit</button>
        </div>
      </form>
      <p id="addMsg" class="muted" style="margin-top:.5rem"></p>
    </section>

    <div style="margin-top:2rem; padding:1rem; background:#fff3cd; border:1px solid #ffeeba; color:#856404; border-radius:8px; font-size:0.85rem; text-align:center">
      <strong>Medical Disclaimer:</strong> This system is for informational purposes only and does not constitute medical advice. 
      Always consult your healthcare provider for diagnosis and treatment.
    </div>
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
        { html: `<div style="font-size:0.85rem">
           <strong>Food:</strong> ${r.foodIntake || '-'}<br>
           <strong>Event:</strong> ${r.eventActivity || '-'}<br>
           <strong>Symp:</strong> ${r.symptoms || '-'}
         </div>` }, 
        { html: `
            <button class="edit-btn" data-id="${r.id}" style="margin-right:5px; padding:2px 6px; border:1px solid #ccc; border-radius:4px; cursor:pointer">Edit</button>
            <button class="del-btn" data-id="${r.id}" style="color:red;border:1px solid red;background:white;border-radius:4px;cursor:pointer;padding:2px 6px">×</button>
        ` }
      ]);
      
      const head = `<thead><tr><th>Date</th><th>Value</th><th>Category</th><th>Details</th><th>Actions</th></tr></thead>`;
      tableEl.innerHTML = head + `<tbody>${rowsHtml(tableRows)}</tbody>`;

      // Delete Handlers
      tableEl.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            if(!confirm('Delete this reading?')) return;
            const id = btn.getAttribute('data-id');
            await deleteReading(id);
            const idx = allReadings.findIndex(r => String(r.id) === String(id));
            if(idx > -1) allReadings.splice(idx, 1);
            render();
        };
      });

      // Edit Handlers
      tableEl.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const r = allReadings.find(x => String(x.id) === String(id));
            if (!r) return;

            root.querySelector('#editId').value = r.id;
            // Pre-fill logic: Convert stored mg/dL to user unit
            const displayV = userUnit === 'mmol/L' ? (r.valueMgdl * 0.0555).toFixed(1) : r.valueMgdl;
            root.querySelector('#val').value = displayV;
            
            root.querySelector('#food').value = r.foodIntake || '';
            root.querySelector('#event').value = r.eventActivity || '';
            root.querySelector('#symp').value = r.symptoms || '';
            
            root.querySelector('#formTitle').textContent = 'Update Reading';
            root.querySelector('#saveBtn').textContent = 'Update';
            root.querySelector('#cancelEdit').style.display = 'inline-block';
            
            const formPanel = root.querySelector('#formPanel');
            formPanel.style.background = '#fff9e6';
            formPanel.scrollIntoView({ behavior: 'smooth' });
        };
      });
    }

    const recent = allReadings.sort((a,b)=> a.ts - b.ts).slice(-14);
    const tips = makeAiAdvice(recent, thr);
    root.querySelector('#aiBox').innerHTML = adviceHtml(tips);
  }

  rangeSel.onchange = render;
  catSel.onchange = render;
  render();

  const addForm = root.querySelector('#addForm');
  const cancelBtn = root.querySelector('#cancelEdit');
  const formPanel = root.querySelector('#formPanel');

  const resetForm = () => {
      root.querySelector('#editId').value = '';
      root.querySelector('#val').value = '';
      root.querySelector('#food').value = '';
      root.querySelector('#event').value = '';
      root.querySelector('#symp').value = '';
      root.querySelector('#formTitle').textContent = 'Log New Reading';
      root.querySelector('#saveBtn').textContent = 'Save Log';
      cancelBtn.style.display = 'none';
      formPanel.style.background = 'transparent';
  };

  cancelBtn.onclick = resetForm;

  addForm.onsubmit = async (e) => {
    e.preventDefault();
    const msg = root.querySelector('#addMsg');
    msg.textContent = '';

    const valInput = root.querySelector('#val');
    let v = parseFloat(valInput.value);
    if (isNaN(v) || v < 0) { msg.textContent = 'Invalid value'; return; }

    const editId = root.querySelector('#editId').value;
    
    const payload = {
      patientId,
      value: v,
      unit: userUnit, // Send correct unit!
      foodIntake: root.querySelector('#food').value,
      eventActivity: root.querySelector('#event').value,
      symptoms: root.querySelector('#symp').value,
      recordedAt: new Date().toISOString()
    };

    let res;
    if (editId) {
        // FIXED: Uses secure updateReading function
        res = await updateReading(editId, payload);
    } else {
        res = await addReading(payload);
    }

    if (!res.ok) {
      msg.textContent = res.error || 'Error saving.';
      return;
    }

    let valMg = v;
    if (userUnit === 'mmol/L') valMg = Math.round(v * 18);
    
    if (editId) {
        const idx = allReadings.findIndex(r => String(r.id) === String(editId));
        if (idx > -1) {
            allReadings[idx] = { ...allReadings[idx], ...payload, valueMgdl: valMg };
        }
    } else {
        allReadings.push({ ...payload, id: res.reading?.id || Date.now(), ts: Date.now(), valueMgdl: valMg });
    }

    resetForm();
    msg.textContent = editId ? 'Updated ✓' : 'Saved ✓';
    render();
  };
}