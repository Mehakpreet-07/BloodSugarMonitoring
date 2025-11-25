// public/js/views/alerts.js
import { listAlerts } from '../api/alerts.js';
import { store } from '../state/store.js';

// Helper to format dates
function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

export async function renderAlerts(root){
  root.innerHTML = `
    <section class="panel">
      <h2>Alerts</h2>
      <div class="tools">
        <input id="q" placeholder="Search patient name…">
        <select id="status">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Acknowledged">Acknowledged</option>
          <option value="Sent">Sent</option>
        </select>
        <button id="go" class="primary">Apply Filter</button>
      </div>
      <table class="list">
        <thead>
            <tr>
                <th>When</th>
                <th>Patient</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody id="body"></tbody>
      </table>
    </section>
  `;

  function row(a){
    // Logic: If Pending -> Show Acknowledge Button
    //        If Acknowledged -> Show "View Chart" Link (The "Purpose" you asked for)
    let actionHtml = '-';
    
    if (a.status === 'Pending') {
        actionHtml = `<button class="ack-btn" data-id="${a.id}" style="padding:0.3rem 0.7rem; border:1px solid var(--accent); color:var(--accent); background:white; border-radius:4px; cursor:pointer">Acknowledge</button>`;
    } else if (a.status === 'Acknowledged') {
        // This closes the loop: Alert -> Acknowledge -> Investigate
        actionHtml = `<a href="#/patients" style="font-size:0.85rem; color:var(--muted); text-decoration:underline">View Chart</a>`;
    }

    return `
      <tr>
        <td>${formatDate(a.triggeredAt)}</td>
        <td><strong>${a.patientName || 'Unknown'}</strong></td>
        <td>${a.reason}</td>
        <td><span class="pill ${a.status === 'Pending' ? 'p-Abnormal' : 'p-Normal'}">${a.status}</span></td>
        <td>${actionHtml}</td>
      </tr>
    `;
  }

  async function load(){
    const data = await listAlerts();
    
    const term = document.getElementById('q').value.toLowerCase();
    const stat = document.getElementById('status').value;

    const filtered = data.filter(a => {
        const matchName = (a.patientName || '').toLowerCase().includes(term);
        const matchStat = !stat || a.status === stat;
        return matchName && matchStat;
    });

    const tbody = document.getElementById('body');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1rem">No alerts found.</td></tr>';
    } else {
        tbody.innerHTML = filtered.map(row).join('');
        
        // Attach listeners
        tbody.querySelectorAll('.ack-btn').forEach(btn => {
            btn.onclick = async () => {
                if(!confirm('Mark this alert as Acknowledged?')) return;
                
                const id = btn.getAttribute('data-id');
                await fetch(`/api/alerts/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': store.csrfToken
                    },
                    body: JSON.stringify({ status: 'Acknowledged' })
                });
                load(); 
            };
        });
    }
  }

  document.getElementById('go').onclick = load;
  load(); 
}