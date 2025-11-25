import { store } from '../state/store.js';
import { listPatients, getPatientReadings } from '../api/patients.js';
import { addReading }                       from '../api/readings.js';
import { getThresholds }                    from '../api/settings.js';
import { toDisplay, categorizeByThresholds }from '../utils/units.js';
import { rowsHtml }                         from '../components/table.js';
import { drawLine }                         from '../components/chart.js';

// Helper to send feedback (with Link support)
async function sendFeedback(patientId, comment, link) {
  const r = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': store.csrfToken },
    body: JSON.stringify({ patientId, comment, link })
  });
  return r.json();
}

export async function renderPatients(root){
  const isStaff = store.user?.role === 'staff';

  root.innerHTML = `
    <section class="panel">
      <h2>Patients Directory</h2>
      <div class="tools">
        <input id="q" placeholder="Search patient…">
        <button id="go" class="primary">Search</button>
      </div>
      <table class="list" id="ptbl">
        <thead><tr><th data-k="name">Name ▲▼</th><th>Email</th><th data-k="cat">Status</th><th></th></tr></thead>
        <tbody id="body"></tbody>
      </table>
    </section>

    <aside class="drawer" id="drawer" aria-hidden="true">
      <button class="close" id="drawerClose">✕</button>
      <h3 id="dName">Patient</h3>
      
      <div class="panel" style="background:#f8fafc; border:1px solid var(--line); margin:1rem 0; font-size:0.9rem">
         <p><strong>Email:</strong> <span id="dEmail">-</span></p>
         <p><strong>Phone:</strong> <span id="dPhone">-</span></p>
         <p><strong>HC #:</strong> <span id="dHC">-</span></p>
         <p><strong>DOB:</strong> <span id="dDOB">-</span></p>
      </div>

      ${!isStaff ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem">
            <h4 style="margin:0">Glucose History</h4>
            <select id="dRange" style="font-size:0.8rem; padding:0.2rem">
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 3 Months</option>
                <option value="all">All Time</option>
            </select>
        </div>
        <canvas id="dChart" style="height:180px"></canvas>
        <div style="overflow-x: auto;">
           <table class="list"><tbody id="dList"></tbody></table>
        </div>
        
        <h4 style="margin-top:1.5rem">Give Feedback</h4>
        <form id="fbForm" style="margin-bottom:1rem">
            <textarea id="fbText" rows="3" placeholder="Write advice..." style="width:100%; margin-bottom:.5rem; padding:0.5rem;"></textarea>
            <input id="fbLink" type="url" placeholder="Attach Link (Optional)" style="width:100%; margin-bottom:.5rem; padding:0.5rem;">
            <button class="primary" type="submit">Send Feedback</button>
            <span id="fbMsg" class="muted" style="margin-left:.5rem;"></span>
        </form>

        <h4 style="border-top:1px solid var(--line); padding-top:1rem">Add Manual Reading</h4>
        <form id="addForm" style="display:grid; gap:0.5rem">
            <div class="row" style="display:flex; gap:0.5rem">
                <input id="val" type="number" placeholder="mg/dL" min="0" required style="flex:1">
                <input id="food" placeholder="Food" style="flex:1">
            </div>
            <div class="row" style="display:flex; gap:0.5rem">
                <input id="event" placeholder="Event" style="flex:1">
                <input id="symp" placeholder="Symptoms" style="flex:1">
            </div>
            <button class="primary" type="submit" style="margin-top:0.5rem">Add Entry</button>
        </form>
      ` : '<p class="muted" style="margin-top:2rem; text-align:center; padding:1rem; border:1px dashed #ccc">Medical charts and readings are restricted for Staff accounts.</p>'}
    </aside>
  `;

  let data = await listPatients();
  let sortKey = 'name', sortDir = 1;
  const drawer = root.querySelector('#drawer');
  
  function renderRows(rows){
    root.querySelector('#body').innerHTML = rowsHtml(rows.map(p => [
      p.name,
      p.email,
      { html: `<span class="pill p-${p.cat}">${p.cat}</span>` },
      { html: `<a href="#" data-id="${p.id}" class="open">View</a>` }
    ]));
    
    root.querySelectorAll('a.open').forEach(a=>{
      a.onclick = async (e)=>{
        e.preventDefault();
        const id = a.getAttribute('data-id');
        const p = data.find(x => String(x.id) === String(id));
        
        // Fetch full profile (needed for Staff to see Phone/HC)
        const profileRes = await fetch(`/api/patients/${id}`, { headers: {'x-csrf-token': store.csrfToken} });
        const profile = (await profileRes.json()).patient;

        openDrawer(p, profile);
      };
    });
  }

  function apply(){
    const term = root.querySelector('#q').value.trim().toLowerCase();
    let rows = data.filter(p => !term || p.name.toLowerCase().includes(term));
    rows.sort((a,b)=> (a[sortKey] > b[sortKey] ? 1 : -1) * sortDir);
    renderRows(rows);
  }

  root.querySelector('#go').onclick = async ()=>{ data = await listPatients(root.querySelector('#q').value); apply(); };
  apply();
  root.querySelector('#drawerClose').onclick = ()=>{ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); };

  async function openDrawer(p, fullProfile){
    // Fill Demographics
    root.querySelector('#dName').textContent = p.name;
    root.querySelector('#dEmail').textContent = fullProfile.email;
    root.querySelector('#dPhone').textContent = fullProfile.phone || '-';
    root.querySelector('#dHC').textContent = fullProfile.healthCareNumber || '-';
    root.querySelector('#dDOB').textContent = fullProfile.dateOfBirth ? fullProfile.dateOfBirth.split('T')[0] : '-';

    if (!isStaff) {
        let readings = await getPatientReadings(p.id);
        const thr = await getThresholds();
        const unit = thr.unit;
        const withCat = r => ({ ...r, cat: categorizeByThresholds(r.valueMgdl, thr) });

        // Chart Filtering Logic
        const renderChart = () => {
            const range = root.querySelector('#dRange').value;
            const now = Date.now();
            const cutoff = range === 'all' ? 0 : now - (parseInt(range)*86400000);
            
            const filtered = readings.filter(r => r.ts >= cutoff).map(withCat);
            
            // Table
            root.querySelector('#dList').innerHTML = rowsHtml(
                filtered.slice().reverse().slice(0,5).map(r => [
                    new Date(r.ts).toLocaleString(),
                    toDisplay(r.valueMgdl, unit),
                    { html: `<span class="pill p-${r.cat}">${r.cat}</span>` }
                ])
            );

            // Chart
            drawLine('dChart', filtered.map(r => ({ x: r.ts, y: r.valueMgdl, cat: r.cat })));
        };

        root.querySelector('#dRange').onchange = renderChart;
        renderChart();

        // Feedback Form (with Link)
        root.querySelector('#fbForm').onsubmit = async (e) => {
            e.preventDefault();
            const txt = root.querySelector('#fbText').value.trim();
            const link = root.querySelector('#fbLink')?.value.trim(); // Optional Link
            if(!txt)return;
            
            await sendFeedback(p.id, txt, link);
            
            root.querySelector('#fbMsg').textContent = 'Sent!';
            root.querySelector('#fbText').value = '';
            if(root.querySelector('#fbLink')) root.querySelector('#fbLink').value = '';
        };

        // Add Reading Form (Corrected Payload)
        root.querySelector('#addForm').onsubmit = async (e) => {
            e.preventDefault();
            const v = Number(root.querySelector('#val').value);
            if(isNaN(v)) return;
            
            const payload = {
                patientId: p.id,
                ts: Date.now(),
                value: v,
                unit: 'mg/dL',
                foodIntake: root.querySelector('#food').value,
                eventActivity: root.querySelector('#event').value,
                symptoms: root.querySelector('#symp').value,
                recordedAt: new Date().toISOString()
            };
            
            await addReading(payload);
            readings = await getPatientReadings(p.id);
            renderChart();
            
            // Clear Inputs
            root.querySelector('#val').value = '';
            root.querySelector('#food').value = '';
            root.querySelector('#event').value = '';
            root.querySelector('#symp').value = '';
        };
    }
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');
  }
}