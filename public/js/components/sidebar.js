// public/js/components/sidebar.js
import { store } from '../state/store.js';

export function mountSidebar(node, onNav){
  function linksFor(role){
    // Not signed in
    if (!role) {
      return [
        { hash:'#/login',    label:'Sign in' },
        { hash:'#/register', label:'Register' }
      ];
    }

<<<<<<< HEAD
    // Patient
=======
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
    if (role === 'patient') {
      return [
        { hash:'#/overview', label:'Overview' },
        { hash:'#/settings', label:'Settings' },
        { hash:'#/profile',  label:'Profile' }
      ];
    }

<<<<<<< HEAD
    // Clinic staff
    if (role === 'staff') {
      return [
        { hash:'#/settings', label:'Settings' },
        { hash:'#/emails',   label:'Email templates' },
        { hash:'#/profile',  label:'Profile' }
      ];
    }

    // Admin
=======
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
    if (role === 'admin') {
      return [
        { hash:'#/dashboard', label:'Dashboard' },
        { hash:'#/patients',  label:'Patients' },
<<<<<<< HEAD
        // Alerts page exists but is reachable from bell / dashboard,
        // so you can leave it out of the sidebar if you want.
=======
        { hash:'#/alerts',    label:'Alerts' },
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
        { hash:'#/settings',  label:'Settings' },
        { hash:'#/emails',    label:'Email templates' },
        { hash:'#/profile',   label:'Profile' }
      ];
    }

<<<<<<< HEAD
    // Doctor and any other clinical role
=======
    // doctor and staff
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
    return [
      { hash:'#/dashboard', label:'Dashboard' },
      { hash:'#/patients',  label:'Patients' },
      // Alerts omitted from sidebar; accessed via bell + dashboard.
      { hash:'#/settings',  label:'Settings' },
      { hash:'#/profile',   label:'Profile' }
    ];
  }

  function render(){
    const u = store.user;
    const items = linksFor(u?.role);
    const current = location.hash || '#/login';

    node.innerHTML = `
      <div class="brand">Blood Sugar</div>
      <nav class="nav">
        ${items.map(i => `
          <a href="${i.hash}"
             data-hash="${i.hash}"
             class="${i.hash === current ? 'active' : ''}">
            ${i.label}
          </a>`).join('')}
      </nav>
    `;

<<<<<<< HEAD
    node.querySelectorAll('a[data-hash]').forEach(a => {
      a.onclick = e => {
=======
    node.querySelectorAll('a[data-hash]').forEach(a=>{
      a.onclick = e=>{
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
        e.preventDefault();
        const h = a.getAttribute('data-hash');
        if (onNav) onNav(h);
      };
    });
  }

  render();
  document.addEventListener('state:change', render);
  window.addEventListener('hashchange', render);
}
