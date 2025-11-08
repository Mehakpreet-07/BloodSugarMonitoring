// public/js/views/patients.js
import { listPatients, getPatientReadings } from '../api/patients.js';
import { addReading } from '../api/readings.js';
import { rowsHtml } from '../components/table.js';
import { drawLine } from '../components/chart.js';
import { getThresholds } from '../api/settings.js';
import { toDisplay, categorizeByThresholds } from '../utils/units.js';

export async function renderPatients(root){
  // ---------- View ----------
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

    <!-- Right-side drawer -->
    <aside class="drawer" id="drawer" aria-hidden="true">
      <button class="close" id="drawerClose">✕</button>
      <h3 id="dName">Patient</h3>
      <p class="muted" id="dMeta"></p>

      <h4>Last 7 readings</h4>
      <canvas id="dChart" style="height:200px"></canvas>

      <h4>Recent</h4>
      <table class="list"><tbody id="dList"></tbody></table>

      <h4 style="margin-top:1rem">Add new reading</h4>
      <form id="addForm">
        <div class="row">
          <input id="val" type="number" placeholder="mg/dL" min="0" required>
          <input id="note" placeholder="Note (optional)">
        </div>
        <button class="primary" type="submit">Add</button>
      </form>
      <p class="muted" id="hint" style="margin-top:.4rem"></p>
    </aside>
  `;

  // ---------- State & refs ----------
  let data = await listPatients();
  let sortKey = 'name', sortDir = 1;

  const drawer  = root.querySelector('#drawer');
  const closeBtn= root.querySelector('#drawerClose');
  const q       = root.querySelector('#q');
  const go      = root.querySelector('#go');
  const body    = root.querySelector('#body');
  const table   = root.querySelector('#ptbl');

  // ---------- Helpers ----------
  function renderRows(rows){
    body.innerHTML = rowsHtml(rows.map(p => [
      p.name,
      p.last,
      `<span class="pill p-${p.cat}">${p.cat}</span>`,
      `<a href="#" data-id="${p.id}" class="open">Open chart</a>`
    ]));

    body.querySelectorAll('a.open').forEach(a=>{
      a.onclick = async (e)=>{
        e.preventDefault();
        const id = a.getAttribute('data-id');
        const p  = data.find(x => String(x.id) === String(id));
        if (p) openDrawer(p);
      };
    });
  }

  function apply(){
    const term = q.value.trim().toLowerCase();
    let rows = data.filter(p => !term || p.name.toLowerCase().includes(term));
    rows.sort((a,b)=> (a[sortKey] > b[sortKey] ? 1 : -1) * sortDir);
    renderRows(rows);
  }

  // ---------- Events: table/search/sort ----------
  go.onclick = async ()=>{ data = await listPatients(q.value); apply(); };
  table.querySelectorAll('th[data-k]').forEach(th=>{
    th.onclick = ()=>{
      const k = th.getAttribute('data-k');
      sortDir = (sortKey === k) ? -sortDir : 1;
      sortKey = k;
      apply();
    };
  });

  apply(); // initial paint

  // ---------- Drawer ----------
  closeBtn.onclick = ()=> {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden','true');
  };

  async function openDrawer(p){
    // Load readings + thresholds/units
    let readings = await getPatientReadings(p.id);
    const thr  = await getThresholds();              // { normalMax, borderlineMax, unit }
    const unit = thr.unit;

    // Update hint text to reflect current settings
    const hintEl = root.querySelector('#hint');
    if (hintEl){
      hintEl.textContent = `Auto-categorized with current settings: ≤${thr.normalMax} Normal, ≤${thr.borderlineMax} Borderline, >${thr.borderlineMax} Abnormal (${unit === 'mmol' ? 'displayed in mmol/L' : 'mg/dL'}).`;
    }

    const withCat = (r) => ({ ...r, cat: categorizeByThresholds(r.valueMgdl, thr) });

    // Header/meta
    root.querySelector('#dName').textContent = p.name;
    root.querySelector('#dMeta').textContent = `${p.last} • ${p.cat}`;

    // Recent list (last 7), unit-aware
    const recent = readings.slice(-7).reverse().map(withCat);
    root.querySelector('#dList').innerHTML = rowsHtml(
      recent.map(r => [
        new Date(r.ts).toLocaleString(),
        toDisplay(r.valueMgdl, unit),
        `<span class="pill p-${r.cat}">${r.cat}</span>`
      ])
    );

    // Mini chart (last 7)
    const pts = readings.slice(-7).map(withCat).map(r => ({ x: r.ts, y: r.valueMgdl, cat: r.cat }));
    drawLine('dChart', pts.length ? pts : [{ x: Date.now(), y: 0, cat: 'Normal' }]);

    // Open drawer
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');

    // Add-reading handler
    const form   = root.querySelector('#addForm');
    const valEl  = root.querySelector('#val');
    const noteEl = root.querySelector('#note');

    form.onsubmit = async (e)=>{
      e.preventDefault();
      const v = Number(valEl.value);
      if (Number.isNaN(v) || v < 0) return;

      const payload = { patientId: p.id, ts: Date.now(), valueMgdl: v, note: noteEl.value?.trim() || '' };
      const res = await addReading(payload);
      if (!res || res.ok !== true) return;

      // Update local state & repaint (unit + thresholds respected)
      const newRow = { id: res.id || Date.now(), ...payload };
      readings = readings.concat(newRow);

      const recent2 = readings.slice(-7).reverse().map(withCat);
      root.querySelector('#dList').innerHTML = rowsHtml(
        recent2.map(r => [
          new Date(r.ts).toLocaleString(),
          toDisplay(r.valueMgdl, unit),
          `<span class="pill p-${r.cat}">${r.cat}</span>`
        ])
      );

      const pts2 = readings.slice(-7).map(withCat).map(r => ({ x: r.ts, y: r.valueMgdl, cat: r.cat }));
      drawLine('dChart', pts2);

      valEl.value = '';
      noteEl.value = '';
    };
  }

  // Optional: live re-apply if thresholds are changed on the Settings page
  document.addEventListener('settings:thresholdsChanged', async () => {
    const open = drawer.classList.contains('open');
    if (!open) return;
    const name = root.querySelector('#dName')?.textContent;
    const row = (await listPatients()).find(p => p.name === name);
    if (row) openDrawer(row);
  });
}
