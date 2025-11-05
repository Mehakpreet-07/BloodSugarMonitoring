import { listAlerts } from '../api/alerts.js';
import { rowsHtml } from '../components/table.js';

export async function renderAlerts(root){
  root.innerHTML = `
    <section class="panel">
      <h2>Alerts</h2>
      <div class="tools">
        <input id="q" placeholder="Search patient…">
        <select id="cat"><option value="">All</option><option>Abnormal</option><option>Borderline</option><option>Normal</option></select>
        <button id="go" class="primary">Apply</button>
      </div>
      <table class="list">
        <thead><tr><th>When</th><th>Patient</th><th>Category</th><th>Note</th></tr></thead>
        <tbody id="body"></tbody>
      </table>
    </section>
  `;
  async function load(){
    const data = await listAlerts({ q: document.getElementById('q').value, cat: document.getElementById('cat').value });
    document.getElementById('body').innerHTML = rowsHtml(data.map(a=>[
      a.when, a.name, `<span class="pill p-${a.cat}">${a.cat}</span>`, a.note
    ]));
  }
  document.getElementById('go').onclick = load;
  load();
}
