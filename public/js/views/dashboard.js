// public/js/views/dashboard.js
import { store } from '../state/store.js';
import { getWeather } from '../api/weather.js';
import { drawLine } from '../components/chart.js';
import { rowsHtml } from '../components/table.js';
import { DAY, now, fmtDate } from '../utils/dates.js';
import { getKpis } from '../api/kpis.js';
import { listAlerts }   from '../api/alerts.js';
import { listPatients, getPatientReadings } from '../api/patients.js';
import { getThresholds } from '../api/settings.js';
import { toDisplay, categorizeByThresholds } from '../utils/units.js';

export async function renderDashboard(root){
  const role = store.user?.role || 'guest';
  const weatherCard = `
    <section class="panel" id="weatherPanel">
      <h2>Today’s Weather</h2>
      <div id="weatherInfo" class="muted">Loading current weather…</div>
    </section>
  `;

  if (role === 'patient') {
    root.innerHTML = `
      ${weatherCard}
      <section class="panel" style="margin-top:1rem">
        <h2>My Recent Readings</h2>
        <canvas id="trend" aria-label="My blood sugar trend" style="height:220px"></canvas>
        <details class="muted" style="margin-top:.5rem">
          <summary>Show data table</summary>
          <table class="list" id="dataTable"></table>
        </details>
      </section>
    `;

    try {
      const myId = store.user?.patientId;
      const [thr, myReadings, ptsList] = await Promise.all([
        getThresholds(),
        getPatientReadings(myId),
        listPatients()
      ]);
      const me = ptsList.find(p => String(p.id) === String(myId)) || { name:'Me' };

      const last7 = myReadings.slice(-7);
      const series = last7.map(r => {
        const cat = categorizeByThresholds(r.valueMgdl, thr);
        return { x:r.ts, y:r.valueMgdl, cat };
      });
      drawLine('trend', series.length ? series : [{ x: Date.now(), y: 0, cat: 'Normal' }]);

      const head = `<thead><tr><th>Date</th><th>${me.name}</th><th>Value</th><th>Category</th></tr></thead>`;
      const body = rowsHtml(last7.map(r=>{
        const cat = categorizeByThresholds(r.valueMgdl, thr);
        return [fmtDate(r.ts), me.name, toDisplay(r.valueMgdl, thr.unit), `<span class="pill p-${cat}">${cat}</span>`];
      }));
      document.getElementById('dataTable').innerHTML = head + `<tbody>${body}</tbody>`;
    } catch {
      document.getElementById('dataTable').innerHTML = '<tbody><tr><td>Unable to load your data.</td></tr></tbody>';
    }

    getWeather().then(({city,desc,temp,hum,icon})=>{
      document.getElementById('weatherInfo').innerHTML =
        `<div class="row"><img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" width="48" height="48">
         <div><strong>${city}</strong><br>${desc} • ${temp}°C${hum?` • ${hum}% humidity`:''}</div></div>`;
    }).catch(()=> document.getElementById('weatherInfo').textContent='Unable to load weather.');
    return;
  }

  // doctor, admin, staff
  root.innerHTML = `
    ${weatherCard}

    <section class="grid kpis" style="margin-top:1rem" id="kpisRow">
      <div class="panel kpi"><h3>Total Patients</h3><div class="val" id="kpiPatients">—</div><div class="muted">Active panel</div></div>
      <div class="panel kpi"><h3>Open Alerts</h3><div class="val" id="kpiAlerts">—</div><span class="badge b-bad" id="kpiCritical">— critical</span></div>
      <div class="panel kpi"><h3>Today’s Consults</h3><div class="val" id="kpiConsults">—</div><span class="badge b-warn" id="kpiPending">— pending</span></div>
    </section>

    <section class="grid two" style="margin-top:1rem">
      <div class="panel">
        <h2 style="margin:0 0 .5rem">Abnormal Readings (Last 7 Days)</h2>
        <div class="tools">
          <input id="filterPatient" placeholder="Search patient…">
          <select id="filterCat"><option value="">All</option><option>Abnormal</option><option>Borderline</option><option>Normal</option></select>
          <button class="primary" id="applyFilters">Apply</button>
        </div>
        <canvas id="trend" aria-label="Trend of blood sugar readings"></canvas>
        <details class="muted" style="margin-top:.5rem">
          <summary>Show data table</summary>
          <table class="list" id="dataTable"></table>
        </details>
      </div>

      <div class="panel" id="alertsPanel">
        <h2 style="margin:0 0 .5rem">Recent Alerts</h2>
        <table class="list"><thead><tr><th>When</th><th>Patient</th><th>Category</th><th>Note</th></tr></thead>
        <tbody id="alertsBody"></tbody></table>
        <div class="tools"><button id="viewAllAlerts">View all alerts</button></div>
      </div>
    </section>

    <section class="panel" style="margin-top:1rem">
      <h2 style="margin:0 0 .5rem">Patients Snapshot</h2>
      <table class="list" id="patientsTable">
        <thead><tr><th>Name</th><th>Last reading</th><th>Status</th><th></th></tr></thead>
        <tbody id="patientsBody"></tbody>
      </table>
      <div class="tools"><a href="#/patients">Go to Patients</a></div>
    </section>
  `;

  getWeather().then(({city,desc,temp,hum,icon})=>{
    document.getElementById('weatherInfo').innerHTML =
      `<div class="row"><img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" width="48" height="48">
       <div><strong>${city}</strong><br>${desc} • ${temp}°C${hum?` • ${hum}% humidity`:''}</div></div>`;
  }).catch(()=> document.getElementById('weatherInfo').textContent='Unable to load weather.');

  getKpis().then(k => {
    document.getElementById('kpiPatients').textContent = k.patients;
    document.getElementById('kpiAlerts').textContent   = k.alerts;
    document.getElementById('kpiCritical').textContent = `${k.critical} critical`;
    document.getElementById('kpiConsults').textContent = k.consults;
    document.getElementById('kpiPending').textContent  = `${k.pending} pending`;
  }).catch(()=>{});

  const pts = [
    {name:'Rahul C.',  x:now()-6*DAY, y:175, cat:'Borderline'},
    {name:'Rahul C.',  x:now()-5*DAY, y:192, cat:'Abnormal'},
    {name:'Bhavni R.', x:now()-4*DAY, y:138, cat:'Borderline'},
    {name:'Bhavni R.', x:now()-3*DAY, y:205, cat:'Abnormal'},
    {name:'Rahul C.',  x:now()-2*DAY, y:118, cat:'Normal'},
    {name:'M. Singh',  x:now()-1*DAY, y:210, cat:'Abnormal'},
    {name:'R. Kaur',   x:now()-0*DAY, y:126, cat:'Normal'},
  ];
  drawLine('trend', pts);
  const head = `<thead><tr><th>Date</th><th>Patient</th><th>mg/dL</th><th>Category</th></tr></thead>`;
  const body = rowsHtml(pts.sort((a,b)=>a.x-b.x).map(r=>[
    fmtDate(r.x), r.name, r.y, `<span class="pill p-${r.cat}">${r.cat}</span>`
  ]));
  document.getElementById('dataTable').innerHTML = head + `<tbody>${body}</tbody>`;

  listAlerts().then(alerts=>{
    document.getElementById('alertsBody').innerHTML = alerts.map(a => `
      <tr><td>${a.when}</td><td>${a.name}</td><td><span class="pill p-${a.cat}">${a.cat}</span></td><td>${a.note}</td></tr>
    `).join('');
  }).catch(()=>{});

  listPatients().then(ps=>{
    document.getElementById('patientsBody').innerHTML = ps.map(p => `
      <tr><td>${p.name}</td><td>${p.last}</td><td><span class="pill p-${p.cat}">${p.cat}</span></td><td><a href="#/patients">Open chart</a></td></tr>
    `).join('');
  }).catch(()=>{});
}
