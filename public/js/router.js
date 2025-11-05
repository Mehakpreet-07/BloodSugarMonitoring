import { renderDashboard } from './views/dashboard.js';
import { renderPatients  } from './views/patients.js';
import { renderAlerts    } from './views/alerts.js';
import { renderSettings  } from './views/settings.js';

const routes = {
  '#/dashboard': renderDashboard,
  '#/patients' : renderPatients,
  '#/alerts'   : renderAlerts,
  '#/settings' : renderSettings
};

export function router(){
  const page = document.getElementById('page');
  const hash = location.hash || '#/dashboard';
  page.innerHTML = '';
  (routes[hash] || renderDashboard)(page);
}

export function goto(hash){ location.hash = hash; }
