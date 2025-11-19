import { listPatients, getPatientReadings } from '../api/patients.js';
import { addReading }                       from '../api/readings.js';
import { getThresholds }                    from '../api/settings.js';
import { toDisplay, categorizeByThresholds }from '../utils/units.js';
import { rowsHtml }                         from '../components/table.js';
import { drawLine }                         from '../components/chart.js';

// Internal Helper to send feedback
async function sendFeedback(patientId, comment) {
  const r = await fetch('/api/feedback', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ patientId, comment })
  });
  return r.json();
}

export async function renderPatients(root){
  root.innerHTML = `
    <section class="panel">
      <h2>Patients</h2>
      <div class="tools">
        <input id="q" placeholder="Search patient…">
        <button id="go" class="primary">Search</button>
      </div>
      <table class="list" id="ptbl">
        <thead>
          <tr>
            <th data-k="name">Name ▲▼</th>
            <th data-k="last">Last reading ▲▼</th>
            <th data-k="cat">Status ▲▼</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="body"></tbody>
      </table>
    </section>

    <aside class="drawer" id="drawer" aria-hidden="true">
      <button class="close" id="drawerClose">✕</button>
      <h3 id="dName">Patient</h3>
      <p class="muted" id="dMeta"></p>

      <h4>Last 7 readings</h4>
      <canvas id="dChart" style="height:180px"></canvas>

      <h4>Recent Data</h4>
      <table class="list"><tbody id="dList"></tbody></table>

      <h4 style="margin-top:1.5rem">Give Feedback</h4>
      <form id="fbForm" style="margin-bottom:1rem">
        <textarea id="fbText" rows="3" placeholder="Write advice or feedback for the patient..." style="width:100%; margin-bottom:.5rem"></textarea>
        <button class="primary" type="submit">Send Feedback</button>
        <span id="fbMsg" class="muted" style="margin-left:.5rem"></span>
      </form>

      <h4 style="border-top:1px solid var(--line); padding-top:1rem">Add Manual Reading</h4>
      <form id="addForm">
        <div class="row">
          <input id="val" type="number" placeholder="mg/dL" min="0" required>
          <input id="note" placeholder="Note (optional)">
        </div>
        <button class="primary" type="submit">Add</button>
      </form>
    </aside>
  `;

  let data = await listPatients();
  let sortKey = 'name', sortDir = 1;

  const drawer = root.querySelector('#drawer');
  const closeBtn = root.querySelector('#drawerClose');
  const q = root.querySelector('#q');
  const go = root.querySelector('#go');
  const body = root.querySelector('#body');
  const table = root.querySelector('#ptbl');

  function renderRows(rows){
    body.innerHTML = rowsHtml(rows.map(p => [
      p.name,
      p.last,
      { html: `<span class="pill p-${p.cat}">${p.cat}</span>` },
      { html: `<a href="#" data-id="${p.id}" class="open">Open chart</a>` }
    ]));
    body.querySelectorAll('a.open').forEach(a=>{
      a.onclick = async (e)=>{
        e.preventDefault();
        const id = a.getAttribute('data-id');
        const p  = data.find(x => String(x.id) === String(id));
        openDrawer(p);
      };
    });
  }

  function apply(){
    const term = q.value.trim().toLowerCase();
    let rows = data.filter(p => !term || p.name.toLowerCase().includes(term));
    rows.sort((a,b)=> (a[sortKey] > b[sortKey] ? 1 : -1) * sortDir);
    renderRows(rows);
  }

  go.onclick = async ()=>{ data = await listPatients(q.value); apply(); };
  
  table.querySelectorAll('th[data-k]').forEach(th=>{
    th.onclick = ()=>{
      const k = th.getAttribute('data-k');
      sortDir = (sortKey===k) ? -sortDir : 1;
      sortKey = k;
      apply();
    };
  });

  apply();

  closeBtn.onclick = ()=>{
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden','true');
  };

  async function openDrawer(p){
    let readings = await getPatientReadings(p.id);
    const thr  = await getThresholds();
    const unit = thr.unit;
    const withCat = r => ({ ...r, cat: categorizeByThresholds(r.valueMgdl, thr) });

    root.querySelector('#dName').textContent = p.name;
    root.querySelector('#dMeta').textContent = `${p.last} • ${p.cat}`;

    const recent = readings.slice(-7).reverse().map(withCat);
    root.querySelector('#dList').innerHTML = rowsHtml(
      recent.map(r => [
        new Date(r.ts).toLocaleString(),
        toDisplay(r.valueMgdl, unit),
        { html: `<span class="pill p-${r.cat}">${r.cat}</span>` }
      ])
    );

    const pts = readings.slice(-7).map(withCat).map(r => ({ x:r.ts, y:r.valueMgdl, cat:r.cat }));
    drawLine('dChart', pts.length ? pts : [{ x: Date.now(), y: 0, cat: 'Normal' }]);

    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');

    // Wire Feedback Form
    const fbForm = root.querySelector('#fbForm');
    const fbText = root.querySelector('#fbText');
    const fbMsg  = root.querySelector('#fbMsg');
    
    fbMsg.textContent = '';
    fbText.value = '';

    fbForm.onsubmit = async (e) => {
        e.preventDefault();
        const comment = fbText.value.trim();
        if(!comment) return;
        
        fbMsg.textContent = 'Sending...';
        const res = await sendFeedback(p.id, comment);
        if(res.ok) {
            fbMsg.textContent = 'Sent!';
            fbText.value = '';
        } else {
            fbMsg.textContent = 'Error.';
        }
    };

    // Wire Add Form
    const form  = root.querySelector('#addForm');
    const valEl = root.querySelector('#val');
    const noteEl= root.querySelector('#note');

    form.onsubmit = async (e)=>{
      e.preventDefault();
      const v = Number(valEl.value);
      if (Number.isNaN(v) || v < 0) return;

      const payload = { patientId: p.id, ts: Date.now(), valueMgdl: v, note: noteEl.value?.trim() || '' };
      const res = await addReading(payload);
      if (!res || res.ok !== true) return;

      readings = readings.concat({ id: res.id || Date.now(), ...payload });
      
      // Re-render list and chart
      const recent2 = readings.slice(-7).reverse().map(withCat);
      root.querySelector('#dList').innerHTML = rowsHtml(
        recent2.map(r => [
          new Date(r.ts).toLocaleString(),
          toDisplay(r.valueMgdl, unit),
          { html: `<span class="pill p-${r.cat}">${r.cat}</span>` }
        ])
      );

      const pts2 = readings.slice(-7).map(withCat).map(r => ({ x:r.ts, y:r.valueMgdl, cat:r.cat }));
      drawLine('dChart', pts2);

      valEl.value = '';
      noteEl.value = '';
    };
  }
}