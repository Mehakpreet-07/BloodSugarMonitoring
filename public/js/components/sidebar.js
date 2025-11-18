// public/js/components/sidebar.js
import { store } from '../state/store.js';

export function mountSidebar(node, onNav){
  function linksFor(role){
    if (!role) {
      return [
        { hash:'#/login',    label:'Sign in' },
        { hash:'#/register', label:'Register' }
      ];
    }
    if (role === 'patient') {
      return [
        { hash:'#/overview', label:'Overview' },
        { hash:'#/profile',  label:'Profile' }
      ];
    }
    // doctor, admin, staff
    return [
      { hash:'#/dashboard', label:'Dashboard' },
      { hash:'#/patients',  label:'Patients' },
      { hash:'#/alerts',    label:'Alerts' },
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
    node.querySelectorAll('a[data-hash]').forEach(a=>{
      a.onclick = e=>{
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
