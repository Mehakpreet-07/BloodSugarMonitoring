import { renderDashboard }  from './views/dashboard.js';
import { renderPatients }   from './views/patients.js';
import { renderAlerts }     from './views/alerts.js';
import { renderSettings }   from './views/settings.js';
import { renderProfile }    from './views/profile.js';
import { renderOverview }   from './views/overview.js';
import { renderLogin }      from './views/login.js';
import { renderRegister }   from './views/register.js';
import { renderEmailTemplates } from './views/emailTemplates.js';
import { renderAdmin }      from './views/admin.js'; // <--- NEW IMPORT
import { store }            from './state/store.js';

const routes = {
  '#/login'    : renderLogin,
  '#/register' : renderRegister,
  '#/dashboard': renderDashboard,
  '#/patients' : renderPatients,
  '#/alerts'   : renderAlerts,
  '#/settings' : renderSettings,
  '#/profile'  : renderProfile,
  '#/overview' : renderOverview,
  '#/emails'   : renderEmailTemplates,
  '#/admin'    : renderAdmin // <--- NEW ROUTE
};

function defaultHashFor(user){
  if (!user) return '#/login';
  return user.role === 'patient' ? '#/overview' : '#/dashboard';
}

export function router(){
  const page = document.getElementById('page');
  let hash = location.hash || '#/login';
  const user = store.user;

  const publicRoutes = new Set(['#/login', '#/register']);

  if (!user && !publicRoutes.has(hash)) {
    hash = '#/login';
    if (location.hash !== hash) location.hash = hash;
  }

  // Security Check for Admin Route
  if (hash === '#/admin' && user?.role !== 'admin') {
      hash = defaultHashFor(user);
      if (location.hash !== hash) location.hash = hash;
  }

  // Render page
  page.innerHTML = '';
  (routes[hash] || renderLogin)(page);

  const map = {
    '#/login'    : 'Sign in',
    '#/register' : 'Register',
    '#/dashboard': 'Dashboard',
    '#/patients' : 'Patients',
    '#/alerts'   : 'Alerts',
    '#/settings' : 'Settings',
    '#/profile'  : 'Profile',
    '#/overview' : 'Overview',
    '#/emails'   : 'Email templates',
    '#/admin'    : 'User Management'
  };

  const crumbs = document.querySelector('#head .crumbs');
  if (crumbs) crumbs.textContent = map[hash] || '';
}

export function goto(hash){
  location.hash = hash;
}