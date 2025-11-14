// public/js/views/patients.js
import { listPatients, getPatientReadings } from '../api/patients.js';
import { addReading }                     from '../api/readings.js';
import { getThresholds }                  from '../api/settings.js';
import { toDisplay, categorizeByThresholds } from '../utils/units.js';
import { rowsHtml }                       from '../components/table.js';
import { drawLine }                       from '../components/chart.js';

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
      <p class="muted" style="margin-top:.4rem">
        Auto categorized by thresholds in Settings.
      </p>
    </aside>
  `;

  // state
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
      `<span class="pill p-${p.cat}">${p.cat}</span>`,
      `<a href="#" data-id="${p.id}" class="open">Open chart</a>`
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

    // header/meta
    root.querySelector('#dName').textContent = p.name;
    root.querySelector('#dMeta').textContent = `${p.last} • ${p.cat}`;

    // recent list
    const recent = readings.slice(-7).reverse().map(withCat);
    root.querySelector('#dList').innerHTML = rowsHtml(
      recent.map(r => [
        new Date(r.ts).toLocaleString(),
        toDisplay(r.valueMgdl, unit),
        `<span class="pill p-${r.cat}">${r.cat}</span>`
      ])
    );

    // chart
    const pts = readings.slice(-7).map(withCat).map(r => ({ x:r.ts, y:r.valueMgdl, cat:r.cat }));
    drawLine('dChart', pts.length ? pts : [{ x: Date.now(), y: 0, cat: 'Normal' }]);

    // open
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');

    // add form
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

      const recent2 = readings.slice(-7).reverse().map(withCat);
      root.querySelector('#dList').innerHTML = rowsHtml(
        recent2.map(r => [
          new Date(r.ts).toLocaleString(),
          toDisplay(r.valueMgdl, unit),
          `<span class="pill p-${r.cat}">${r.cat}</span>`
        ])
      );

      const pts2 = readings.slice(-7).map(withCat).map(r => ({ x:r.ts, y:r.valueMgdl, cat:r.cat }));
      drawLine('dChart', pts2);

      valEl.value = '';
      noteEl.value = '';
    };
  }
}
