import { listPatients } from '../api/patients.js';
import { rowsHtml } from '../components/table.js';

export async function renderPatients(root){
  root.innerHTML = `
    <section class="panel">
      <h2>Patients</h2>
      <div class="tools">
        <input id="q" placeholder="Search patient…">
        <button id="go" class="primary">Search</button>
      </div>
      <table class="list">
        <thead><tr><th>Name</th><th>Last reading</th><th>Status</th></tr></thead>
        <tbody id="body"></tbody>
      </table>
    </section>
  `;
  async function load(){
    const data = await listPatients(document.getElementById('q').value);
    document.getElementById('body').innerHTML =
      rowsHtml(data.map(p=>[p.name, p.last, `<span class="pill p-${p.cat}">${p.cat}</span>`]));
  }
  document.getElementById('go').onclick = load;
  load();
}
