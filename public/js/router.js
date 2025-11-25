import { renderDashboard }  from './views/dashboard.js';
import { renderPatients }   from './views/patients.js';
import { renderAlerts }     from './views/alerts.js';
import { renderSettings }   from './views/settings.js';
import { renderProfile }    from './views/profile.js';
import { renderOverview }   from './views/overview.js';
import { renderLogin }      from './views/login.js';
import { renderRegister }   from './views/register.js';
import { renderEmailTemplates } from './views/emailTemplates.js';
import { renderAdmin }      from './views/admin.js';
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
  '#/admin'    : renderAdmin
};

function defaultHashFor(user){
  if (!user) return '#/login';
  if (user.role === 'patient') return '#/overview';
  if (user.role === 'admin') return '#/admin';
  return '#/dashboard';
}

export function router(){
  const page = document.getElementById('page');
  let hash = location.hash || '#/login';
  const user = store.user;

  const publicRoutes = new Set(['#/login', '#/register']);

  // 1. Not logged in -> Login
  if (!user && !publicRoutes.has(hash)) {
    hash = '#/login';
    if (location.hash !== hash) location.hash = hash;
  }

  // 2. Patient attempting to access Admin/Staff pages
  if (
    user?.role === 'patient' &&
    (hash === '#/patients' || hash === '#/alerts' || hash === '#/dashboard' || hash === '#/emails' || hash === '#/admin')
  ){
    hash = '#/overview';
    if (location.hash !== hash) location.hash = hash;
  }

  // 3. Admin attempting to access Medical pages (Charts/Alerts)
  // SRS Compliance: Admins manage users, they don't view medical charts.
  if (
    user?.role === 'admin' &&
    (hash === '#/patients' || hash === '#/alerts')
  ){
      hash = '#/admin';
      if (location.hash !== hash) location.hash = hash;
  }

  // 4. Staff/Admin Pages
  const restricted = new Set(['#/emails']);
  if (user && restricted.has(hash) && (user.role !== 'admin' && user.role !== 'staff')) {
    hash = defaultHashFor(user);
    if (location.hash !== hash) location.hash = hash;
  }

  // 5. Admin Only Page
  if (hash === '#/admin' && user?.role !== 'admin') {
      hash = defaultHashFor(user);
      if (location.hash !== hash) location.hash = hash;
  }

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