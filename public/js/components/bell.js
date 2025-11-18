// public/js/components/bell.js
// Bell icon with a small dropdown for recent alerts.
// Patients see only their own abnormal alerts.

import { listAlerts } from '../api/alerts.js';
import { store } from '../state/store.js';

export async function mountBell(container) {
  container.innerHTML = `
    <button id="bellBtn" aria-haspopup="true" aria-expanded="false" title="Alerts"
            style="background:transparent;border:0;cursor:pointer;position:relative">
      🔔
      <span id="bellDot" style="position:absolute;right:-2px;top:-2px;display:none;width:8px;height:8px;border-radius:999px;background:#c0352b"></span>
    </button>
    <div id="bellMenu" class="menu" role="menu" aria-label="Alerts"></div>
  `;

  const btn  = container.querySelector('#bellBtn');
  const dot  = container.querySelector('#bellDot');
  const menu = container.querySelector('#bellMenu');

  async function load() {
    const all  = await listAlerts();
    const user = store.user;
    const role = user?.role || 'guest';
    const pid  = user?.id;

    // Patients see only their own Abnormal alerts in the bell
    const data = role === 'patient'
      ? all.filter(a => String(a.patientId) === String(pid)).filter(a => a.cat === 'Abnormal')
      : all;

    dot.style.display = data.length ? 'block' : 'none';

    if (!data.length) {
      menu.innerHTML = `<div class="muted" style="padding:.7rem .8rem">No new alerts</div>`;
      return;
    }

    menu.innerHTML = data.slice(0, 6).map(a => `
      <a href="#/alerts" data-alert-item="1" role="menuitem" style="display:block">
        <div style="font-weight:600">
          ${a.name} • <span class="pill p-${a.cat}">${a.cat}</span>
        </div>
        <div class="muted" style="font-size:.85rem">
          ${a.when} • ${a.note || ''}
        </div>
      </a>
    `).join('');
  }

  await load();

  // Open or close dropdown
  btn.onclick = () => {
    const open = menu.style.display === 'block';
    menu.style.display = open ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!open));
  };

  // Close on outside click
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // When a user clicks an alert inside the menu, route properly
  menu.addEventListener('click', e => {
    const item = e.target.closest('a[data-alert-item]');
    if (!item) return;
    e.preventDefault();

    // Close the menu
    menu.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');

    const user = store.user;
    if (!user) {
      // Safety fallback, should not happen
      location.hash = '#/login';
      return;
    }

    // Patients are not allowed on Alerts page, send them to their overview
    if (user.role === 'patient') {
      location.hash = '#/overview';
    } else {
      location.hash = '#/alerts';
    }
  });
}
