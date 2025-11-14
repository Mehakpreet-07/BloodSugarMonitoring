import { renderDashboard }  from './views/dashboard.js';
import { renderPatients }   from './views/patients.js';
import { renderAlerts }     from './views/alerts.js';
import { renderSettings }   from './views/settings.js';
import { renderProfile }    from './views/profile.js';
import { renderOverview }   from './views/overview.js';
import { renderLogin }      from './views/login.js';
import { renderRegister }   from './views/register.js';
import { store }            from './state/store.js';

const routes = {
  '#/login'    : renderLogin,
  '#/register' : renderRegister,
  '#/dashboard': renderDashboard,
  '#/patients' : renderPatients,
  '#/alerts'   : renderAlerts,
  '#/settings' : renderSettings,
  '#/profile'  : renderProfile,
  '#/overview' : renderOverview
};

function defaultHashFor(user){
  if (!user) return '#/login';
  return user.role === 'patient' ? '#/overview' : '#/dashboard';
}

export function router(){
  const page = document.getElementById('page');
  let hash = location.hash || '#/login';
  const user = store.user;

  // auth guards
  const publicRoutes = new Set(['#/login', '#/register']);
  if (!user && !publicRoutes.has(hash)){
    hash = '#/login';
    if (location.hash !== hash) location.hash = hash;
  }

  // role guards
  if (user?.role === 'patient' && (hash === '#/patients' || hash === '#/alerts' || hash === '#/dashboard')){
    hash = '#/overview';
    if (location.hash !== hash) location.hash = hash;
  }

  // render
  page.innerHTML = '';
  (routes[hash] || renderLogin)(page);
}

export function goto(hash){ location.hash = hash; }

