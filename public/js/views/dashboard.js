import { getWeather } from '../api/weather.js';
import { drawLine } from '../components/chart.js';
import { rowsHtml } from '../components/table.js';
import { DAY, now, fmtDate } from '../utils/dates.js';
import { getKpis } from '../api/kpis.js';
import { listAlerts }   from '../api/alerts.js';
import { listPatients } from '../api/patients.js';

export function renderDashboard(root){
  root.innerHTML = `
    <section class="panel" id="weatherPanel">
      <h2>Today’s Weather</h2>
      <div id="weatherInfo" class="muted">Loading current weather…</div>
    </section>

    <section class="grid kpis" style="margin-top:1rem" id="kpisRow">
      <div class="panel kpi"><h3>Total Patients</h3><div class="val" id="kpiPatients">42</div><div class="muted">Active panel</div></div>
      <div class="panel kpi"><h3>Open Alerts</h3><div class="val" id="kpiAlerts">7</div><span class="badge b-bad" id="kpiCritical">3 critical</span></div>
      <div class="panel kpi"><h3>Today’s Consults</h3><div class="val" id="kpiConsults">5</div><span class="badge b-warn" id="kpiPending">2 pending</span></div>
    </section>

    <section class="grid two" style="margin-top:1rem">
      <div class="panel">
        <h2 style="margin:0 0 .5rem">Abnormal Readings (Last 7 Days)</h2>
        <div class="tools">
          <input id="filterPatient" placeholder="Search patient…" aria-label="Search patient">
          <select id="filterCat" aria-label="Filter by category">
            <option value="">All</option><option>Abnormal</option><option>Borderline</option><option>Normal</option>
          </select>
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
        <table class="list">
          <thead><tr><th>When</th><th>Patient</th><th>Category</th><th>Note</th></tr></thead>
          <tbody id="alertsBody"></tbody>
        </table>
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
// Alerts → table
listAlerts().then(alerts => {
  document.getElementById('alertsBody').innerHTML = alerts.map(a => `
    <tr>
      <td>${a.when}</td>
      <td>${a.name}</td>
      <td><span class="pill p-${a.cat}">${a.cat}</span></td>
      <td>${a.note}</td>
    </tr>`).join('');

  // "View all alerts" button uses same data
  document.getElementById('viewAllAlerts').onclick = () => {
    const panel = document.getElementById('alertsPanel');
    panel.innerHTML = `
      <h2>All Alerts</h2>
      <div class="tools">
        <input id="alertSearch" placeholder="Search patient…">
        <select id="alertCat"><option value="">All</option><option>Abnormal</option><option>Borderline</option><option>Normal</option></select>
        <button id="applyAlertFilter" class="primary">Apply</button>
        <button id="backToRecent">Back</button>
      </div>
      <table class="list"><thead><tr><th>When</th><th>Patient</th><th>Category</th><th>Note</th></tr></thead>
      <tbody id="allAlertsBody"></tbody></table>
    `;
    const render = list => document.getElementById('allAlertsBody').innerHTML =
      list.map(a => `<tr><td>${a.when}</td><td>${a.name}</td><td><span class="pill p-${a.cat}">${a.cat}</span></td><td>${a.note}</td></tr>`).join('');
    const apply = () => {
      const q = document.getElementById('alertSearch').value.trim().toLowerCase();
      const c = document.getElementById('alertCat').value;
      render(alerts.filter(a => (!q || a.name.toLowerCase().includes(q)) && (!c || a.cat === c)));
    };
    document.getElementById('applyAlertFilter').onclick = apply;
    document.getElementById('backToRecent').onclick = () => location.hash = '#/dashboard';
    render(alerts);
  };
}).catch(console.error);

// Patients snapshot → table
listPatients().then(patients => {
  document.getElementById('patientsBody').innerHTML = patients.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.last}</td>
      <td><span class="pill p-${p.cat}">${p.cat}</span></td>
      <td><a href="#/patients">Open chart</a></td>
    </tr>`).join('');
}).catch(console.error);



 // KPIs (patients, alerts, etc.)
getKpis().then(k => {
  document.getElementById('kpiPatients').textContent = k.patients;
  document.getElementById('kpiAlerts').textContent   = k.alerts;
  document.getElementById('kpiCritical').textContent = `${k.critical} critical`;
  document.getElementById('kpiConsults').textContent = k.consults;
  document.getElementById('kpiPending').textContent  = `${k.pending} pending`;
}).catch(() => {
  // optional fallback
  document.getElementById('kpiPatients').textContent = '—';
  document.getElementById('kpiAlerts').textContent   = '—';
  document.getElementById('kpiCritical').textContent = '—';
  document.getElementById('kpiConsults').textContent = '—';
  document.getElementById('kpiPending').textContent  = '—';
});

  // Weather


getWeather().then(({city,desc,temp,hum,icon})=>{
  document.getElementById('weatherInfo').innerHTML =
    `<div class="row">
       <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" width="48" height="48">
       <div><strong>${city}</strong><br>${desc} • ${temp}°C${hum?` • ${hum}% humidity`:''}</div>
     </div>`;
}).catch(()=> document.getElementById('weatherInfo').textContent='Unable to load weather.');

  // Demo data for chart + table
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
  renderTable(pts);

  function renderTable(data){
    const head = `<thead><tr><th>Date</th><th>Patient</th><th>mg/dL</th><th>Category</th></tr></thead>`;
    const body = rowsHtml(data.sort((a,b)=>a.x-b.x).map(r=>[
      fmtDate(r.x), r.name, r.y, `<span class="pill p-${r.cat}">${r.cat}</span>`
    ]));
    document.getElementById('dataTable').innerHTML = head + `<tbody>${body}</tbody>`;
  }
  function applyFilters(){
    const q = document.getElementById('filterPatient').value.trim().toLowerCase();
    const cat = document.getElementById('filterCat').value;
    const filtered = pts.filter(r => (!q || r.name.toLowerCase().includes(q)) && (!cat || r.cat===cat));
    drawLine('trend', filtered.length?filtered:[]);
    renderTable(filtered);
  }
  document.getElementById('applyFilters').onclick = applyFilters;

  // Alerts + Patients demo
  const alerts = [
    { when:'Today 09:40', name:'R. Kaur',   cat:'Abnormal',  note:'> 3 abnormal in 7 days' },
    { when:'Today 08:15', name:'M. Singh',  cat:'Borderline',note:'Post-meal spike' }
  ];
  document.getElementById('alertsBody').innerHTML = rowsHtml(alerts.map(a=>[
    a.when, a.name, `<span class="pill p-${a.cat}">${a.cat}</span>`, a.note
  ]));

  const patients = [
    { name:'Rahul C.', last:'Today 10:05', cat:'Normal' },
    { name:'Bhavni R.', last:'Yesterday 22:10', cat:'Abnormal' }
  ];
  document.getElementById('patientsBody').innerHTML = rowsHtml(patients.map(p=>[
    p.name, p.last, `<span class="pill p-${p.cat}">${p.cat}</span>`, `<a href="#/patients">Open chart</a>`
  ]));

  document.getElementById('viewAllAlerts').onclick = ()=>{
    const panel = document.getElementById('alertsPanel');
    panel.innerHTML = `
      <h2>All Alerts</h2>
      <div class="tools">
        <input id="alertSearch" placeholder="Search patient…">
        <select id="alertCat"><option value="">All</option><option>Abnormal</option><option>Borderline</option><option>Normal</option></select>
        <button id="applyAlertFilter" class="primary">Apply</button>
        <button id="backToRecent">Back</button>
      </div>
      <table class="list"><thead><tr><th>When</th><th>Patient</th><th>Category</th><th>Note</th></tr></thead>
      <tbody id="allAlertsBody"></tbody></table>
    `;
    const all = alerts.concat([
      { when:'Yesterday', name:'Rahul C.',  cat:'Normal',   note:'—' },
      { when:'2 days ago',name:'Bhavni R.', cat:'Abnormal', note:'> 3 abnormal in 7 days' }
    ]);
    const render = list => document.getElementById('allAlertsBody').innerHTML =
      rowsHtml(list.map(a=>[a.when,a.name,`<span class="pill p-${a.cat}">${a.cat}</span>`,a.note]));
    const apply = ()=>{
      const q = document.getElementById('alertSearch').value.trim().toLowerCase();
      const c = document.getElementById('alertCat').value;
      render(all.filter(a => (!q || a.name.toLowerCase().includes(q)) && (!c || a.cat===c)));
    };
    document.getElementById('applyAlertFilter').onclick = apply;
    document.getElementById('backToRecent').onclick = ()=> location.hash = '#/dashboard';
    render(all);
  };
}
