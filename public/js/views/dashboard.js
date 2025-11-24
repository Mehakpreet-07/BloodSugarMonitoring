// public/js/views/dashboard.js
import { store } from '../state/store.js';
import { getWeather } from '../api/weather.js';
import { drawLine } from '../components/chart.js';
import { rowsHtml } from '../components/table.js';
import { getKpis } from '../api/kpis.js';
import { listAlerts } from '../api/alerts.js';
import { listPatients } from '../api/patients.js';
import { getThresholds } from '../api/settings.js';
import { toDisplay, categorizeByThresholds } from '../utils/units.js';

// Helper to format dates
function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

export async function renderDashboard(root){
  const role = store.user?.role || 'guest';
  
  // --- 1. PATIENT VIEW (Redirect to Overview) ---
  if (role === 'patient') {
    location.hash = '#/overview';
    return;
  }

  // --- 2. SPECIALIST / ADMIN / STAFF VIEW ---
  root.innerHTML = `
    <section class="panel" id="weatherPanel">
      <h2>Today’s Weather</h2>
      <div id="weatherInfo" class="muted">Loading...</div>
    </section>

    <section class="grid kpis" style="margin-top:1rem" id="kpisRow">
      <div class="panel kpi"><h3>Total Patients</h3><div class="val" id="kpiPatients">—</div><div class="muted">Active panel</div></div>
      <div class="panel kpi"><h3>Open Alerts</h3><div class="val" id="kpiAlerts">—</div><span class="badge b-bad" id="kpiCritical">— critical</span></div>
      <div class="panel kpi"><h3>Today’s Consults</h3><div class="val" id="kpiConsults">0</div><span class="badge b-warn" id="kpiPending">0 pending</span></div>
    </section>

    <section class="grid two" style="margin-top:1rem">
      <div class="panel">
        <h2 style="margin:0 0 .5rem">Readings (Last 7 Days)</h2>
        <div class="tools">
          <input id="filterPatient" placeholder="Search patient name...">
          <select id="filterCat">
            <option value="">All Categories</option>
            <option value="Abnormal">Abnormal</option>
            <option value="Borderline">Borderline</option>
            <option value="Normal">Normal</option>
          </select>
          <button class="primary" id="applyFilters">Apply</button>
        </div>
        <canvas id="trend" aria-label="Trend of blood sugar readings" style="height:260px"></canvas>
        <p id="chartMsg" class="muted" style="display:none; text-align:center; margin-top:1rem">No data found for these filters.</p>
      </div>

      <div class="panel" id="alertsPanel">
        <h2 style="margin:0 0 .5rem">Recent Alerts</h2>
        <div style="overflow-x:auto">
          <table class="list">
            <thead><tr><th>When</th><th>Patient</th><th>Note</th></tr></thead>
            <tbody id="alertsBody"></tbody>
          </table>
        </div>
        <div class="tools"><button id="viewAllAlerts">Refresh Alerts</button></div>
      </div>
    </section>

    <section class="panel" style="margin-top:1rem">
      <h2 style="margin:0 0 .5rem">Patients Snapshot</h2>
      <table class="list" id="patientsTable">
        <thead><tr><th>Name</th><th>Last reading</th><th>Status</th><th></th></tr></thead>
        <tbody id="patientsBody"></tbody>
      </table>
      <div class="tools"><a href="#/patients">View all Patients</a></div>
    </section>

    <div style="margin-top:2rem; padding:1rem; background:#fff3cd; border:1px solid #ffeeba; color:#856404; border-radius:8px; font-size:0.85rem; text-align:center">
      <strong>Medical Disclaimer:</strong> This system is for informational purposes only and does not constitute medical advice. 
      Always consult your healthcare provider for diagnosis and treatment.
    </div>
  `;

  // A. Load Weather
  getWeather().then(({city,desc,temp,hum,icon})=>{
    const el = document.getElementById('weatherInfo');
    if(el) el.innerHTML = `<div class="row"><img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" width="48" height="48"><div><strong>${city}</strong><br>${desc} • ${temp}°C${hum?` • ${hum}% humidity`:''}</div></div>`;
  }).catch(()=>{});

  // B. Load KPIs
  getKpis().then(k => {
    document.getElementById('kpiPatients').textContent = k.patients;
    document.getElementById('kpiAlerts').textContent   = k.alerts;
    document.getElementById('kpiCritical').textContent = `${k.critical} critical`;
  }).catch(()=>{});

  // C. Load Alerts
  async function loadAlerts() {
    const alerts = await listAlerts();
    const tbody = document.getElementById('alertsBody');
    
    if (alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="muted">No active alerts</td></tr>';
        return;
    }

    tbody.innerHTML = alerts.slice(0, 5).map(a => `
      <tr>
        <td style="font-size:0.85rem">${formatDate(a.triggeredAt)}</td>
        <td>${a.patientName || 'Unknown'}</td>
        <td>${a.reason}</td>
      </tr>
    `).join('');
  }
  loadAlerts();
  document.getElementById('viewAllAlerts').onclick = loadAlerts;

  // D. Load Patients Snapshot
  listPatients().then(ps => {
    document.getElementById('patientsBody').innerHTML = ps.slice(0, 5).map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.last}</td>
        <td><span class="pill p-${p.cat}">${p.cat}</span></td>
        <td><a href="#/patients" style="font-size:0.9rem">View</a></td>
      </tr>
    `).join('');
  });

  // E. Load Chart Data
  async function loadChart() {
    const thr = await getThresholds();
    const patients = await listPatients();
    
    // Fetch readings for top 5 patients
    const promises = patients.slice(0, 5).map(p => 
        fetch(`/api/patients/${p.id}/readings`).then(r => r.json()).then(d => {
            return (d.readings || []).map(r => ({...r, patientName: p.name}));
        })
    );

    const results = await Promise.all(promises);
    let allReadings = results.flat();

    const filterBtn = document.getElementById('applyFilters');
    
    filterBtn.onclick = () => {
        const nameSearch = document.getElementById('filterPatient').value.toLowerCase();
        const catFilter = document.getElementById('filterCat').value;
        
        const getCat = (val) => {
            if (val <= thr.normalMax) return 'Normal';
            if (val <= thr.borderlineMax) return 'Borderline';
            return 'Abnormal';
        };

        let filtered = allReadings.filter(r => {
            const cat = getCat(r.valueMgPerdL);
            const matchesName = !nameSearch || r.patientName.toLowerCase().includes(nameSearch);
            const matchesCat = !catFilter || cat === catFilter || (catFilter === 'Abnormal' && cat.includes('Abnormal'));
            const sevenDaysAgo = Date.now() - (7 * 86400000);
            const ts = new Date(r.recordedAt).getTime();
            
            return matchesName && matchesCat && ts > sevenDaysAgo;
        });

        filtered.sort((a,b) => new Date(a.recordedAt) - new Date(b.recordedAt));

        const cvs = document.getElementById('trend');
        const msg = document.getElementById('chartMsg');
        
        if (filtered.length === 0) {
            drawLine('trend', []);
            cvs.style.display = 'none';
            msg.style.display = 'block';
        } else {
            cvs.style.display = 'block';
            msg.style.display = 'none';
            const pts = filtered.map(r => ({
                x: new Date(r.recordedAt).getTime(),
                y: r.valueMgPerdL,
                cat: getCat(r.valueMgPerdL)
            }));
            drawLine('trend', pts);
        }
    };

    filterBtn.click();
  }

  loadChart();
}