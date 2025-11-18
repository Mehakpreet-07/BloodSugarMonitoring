// public/js/router.js

// Import functions that helps the page to be viewed into the main 

// each function mentioned below knows how to extract their page content 
// and display it on teh main page 
import { renderDashboard }  from './views/dashboard.js';
import { renderPatients }   from './views/patients.js';
import { renderAlerts }     from './views/alerts.js';
import { renderSettings }   from './views/settings.js';
import { renderProfile }    from './views/profile.js';
import { renderOverview }   from './views/overview.js';
import { renderLogin }      from './views/login.js';
import { renderRegister }   from './views/register.js';


// it will be the current logged in user 

import { renderEmailTemplates } from './views/emailTemplates.js';
import { store }            from './state/store.js';

// route table (hash - veiw function )

//it will map the url hash values to function that will render the page.


const routes = {
  '#/login'    : renderLogin,
  '#/register' : renderRegister,
  '#/dashboard': renderDashboard,
  '#/patients' : renderPatients,
  '#/alerts'   : renderAlerts,
  '#/settings' : renderSettings,
  '#/profile'  : renderProfile,
  '#/overview' : renderOverview,
  '#/emails'   : renderEmailTemplates
};


// main router Function
// it will be called when the hash is changes or when the page is loaded
// it will decide which page to be shown on the basis of URL/ whther teh user is logged in/ or on the user role 

function defaultHashFor(user){
  if (!user) return '#/login';
  return user.role === 'patient' ? '#/overview' : '#/dashboard';
}


export function router(){
  
  //main container where each page with show its html 
  const page = document.getElementById('page');

  //will read the current hash from URL. if not will redirect it to Default login page 
  let hash = location.hash || '#/login';

  //get the current user 
  const user = store.user;

  // Public routes that do not require auth
  const publicRoutes = new Set(['#/login', '#/register']);

  // Not logged in → force to login
  if (!user && !publicRoutes.has(hash)) {
    hash = '#/login';
    
    // update the location.hasg to avoid endless loop 
    if (location.hash !== hash) location.hash = hash;
  }

  // Patients cannot access staff views
  // role based access control 
   

        //heading them back to their overview page 
       
  // Patients cannot access staff/admin views
  if (
    user?.role === 'patient' &&
    (hash === '#/patients' ||
     hash === '#/alerts'   ||
     hash === '#/dashboard'||
     hash === '#/settings' ||
     hash === '#/emails')
  ){

    hash = '#/overview';
    if (location.hash !== hash) location.hash = hash;
  }

  // Admin only routes
  const adminOnly = new Set(['#/emails']);
  if (user && adminOnly.has(hash) && user.role !== 'admin') {
    hash = defaultHashFor(user);
    if (location.hash !== hash) location.hash = hash;
  }

  // Render page
  // will clear all the previoulsy shown page content 
  page.innerHTML = '';
  
  //will call the selected page 
  (routes[hash] || renderLogin)(page);

  // Simple breadcrumb label in header
  const map = {
    '#/login'    : 'Sign in',
    '#/register' : 'Register',
    '#/dashboard': 'Dashboard',
    '#/patients' : 'Patients',
    '#/alerts'   : 'Alerts',
    '#/settings' : 'Settings',
    '#/profile'  : 'Profile',
    '#/overview' : 'Overview',
    '#/emails'   : 'Email templates'
  };
0
  // finding the crumb elements inside the header 
  const crumbs = document.querySelector('#head .crumbs');

  // if found set the  text to current page label 
  if (crumbs) crumbs.textContent = map[hash] || '';
       }

// helper function 
export function goto(hash){

  location.hash = hash;
}

