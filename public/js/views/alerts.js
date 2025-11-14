// public/js/views/alerts.js
import { listAlerts } from '../api/alerts.js';

export async function renderAlerts(root){
  root.innerHTML = `
    <section class="panel">
      <h2>Alerts</h2>
      <div class="tools">
        <input id="q" placeholder="Search patient…">
        <select id="cat">
          <option value="">All</option>
          <option>Abnormal</option>
          <option>Borderline</option>
          <option>Normal</option>
        </select>
        <button id="go" class="primary">Apply</button>
      </div>
      <table class="list">
        <thead><tr><th>When</th><th>Patient</th><th>Category</th><th>Note</th></tr></thead>
        <tbody id="body"></tbody>
      </table>
    </section>
  `;

  function row(a){
    return `
      <tr>
        <td>${a.when}</td>
        <td>${a.name}</td>
        <td><span class="pill p-${a.cat}">${a.cat}</span></td>
        <td>${a.note}</td>
      </tr>
    `;
  }

  async function load(){
    const data = await listAlerts({
      q:   document.getElementById('q').value,
      cat: document.getElementById('cat').value
    });
    document.getElementById('body').innerHTML = data.map(row).join('');
  }
  document.getElementById('go').onclick = load;
  load();
}
