// public/js/components/bell.js
import { listAlerts } from '../api/alerts.js';
import { store } from '../state/store.js';

function formatDate(ts) {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export async function mountBell(container) {
  container.innerHTML = `
    <button id="bellBtn" aria-haspopup="true" aria-expanded="false" title="Alerts"
            style="background:transparent;border:0;cursor:pointer;position:relative;font-size:1.2rem; padding:0.5rem">
      🔔
      <span id="bellDot" style="position:absolute;right:5px;top:5px;display:none;width:8px;height:8px;border-radius:999px;background:#c0352b;border:1px solid white"></span>
    </button>
    <div id="bellMenu" class="menu" role="menu" aria-label="Alerts" style="width:320px; right:-10px"></div>
  `;

  const btn  = container.querySelector('#bellBtn');
  const dot  = container.querySelector('#bellDot');
  const menu = container.querySelector('#bellMenu');

  async function load() {
    try {
        const all  = await listAlerts();
        
        // Show only 'Pending' alerts in the bell for immediate attention
        const data = all.filter(a => a.status === 'Pending');

        dot.style.display = data.length ? 'block' : 'none';

        if (!data.length) {
          menu.innerHTML = `<div class="muted" style="padding:1rem; text-align:center">No new alerts</div>`;
          return;
        }

        // Map Real Data
        menu.innerHTML = data.slice(0, 5).map(a => `
          <a href="#/alerts" data-alert-item="1" role="menuitem" style="display:block; border-bottom:1px solid var(--line); padding:0.8rem">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--muted)">
                <span>${formatDate(a.triggeredAt)}</span>
                <span style="color:var(--bad); font-weight:bold">${a.status}</span>
            </div>
            <div style="font-weight:700; margin:4px 0; color:var(--ink)">
              ${a.patientName || 'Unknown Patient'}
            </div>
            <div class="muted" style="font-size:0.85rem">
              ${a.reason}
            </div>
          </a>
        `).join('') + `<a href="#/alerts" style="display:block; text-align:center; padding:0.8rem; font-weight:600; color:var(--accent); background:#f8fafc">View All Alerts</a>`;
    } catch (e) {
        console.error("Bell load error", e);
        menu.innerHTML = `<div class="muted" style="padding:1rem">Error loading alerts</div>`;
    }
  }

  await load();

  // Toggle Menu
  btn.onclick = (e) => {
    e.stopPropagation();
    const open = menu.style.display === 'block';
    menu.style.display = open ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!open));
  };

  // Close on click outside
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}