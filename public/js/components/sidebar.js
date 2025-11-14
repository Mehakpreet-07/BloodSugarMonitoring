import { store } from '../state/store.js';

function itemsFor(role){
  if (!role) return [];
  if (role === 'patient') return [['#/overview','Overview'], ['#/settings','Settings'], ['#/profile','Profile']];
  if (role === 'admin')   return [['#/dashboard','Dashboard'],['#/patients','Patients'],['#/alerts','Alerts'],['#/settings','Settings'],['#/profile','Profile']];
  if (role === 'staff')   return [['#/dashboard','Dashboard'],['#/patients','Patients'],['#/alerts','Alerts'],['#/profile','Profile']];
  return [['#/dashboard','Dashboard'],['#/patients','Patients'],['#/alerts','Alerts'],['#/settings','Settings'],['#/profile','Profile']];
}

export function mountSidebar(node, onNav){
  function render(){
    const u = store.user;
    const links = itemsFor(u?.role);
    node.innerHTML = `
      <div class="brand">Blood Sugar</div>
      <nav class="nav">
        ${links.map(([href,label],i)=> `<a href="${href}" class="${i===0?'active':''}">${label}</a>`).join('')}
      </nav>
    `;
    node.querySelectorAll('.nav a').forEach(a=>{
      a.addEventListener('click', ()=>{
        node.querySelectorAll('.nav a').forEach(x=>x.classList.remove('active'));
        a.classList.add('active'); onNav(a.getAttribute('href'));
      });
    });
  }
  render();
  document.addEventListener('state:change', render);
}
