import { store } from '../state/store.js';

export function mountHeader(node){
  function render(){
    const u = store.user;
    node.innerHTML = `
      <div class="crumbs"></div>
      <div class="avatar">
        <div class="pic" aria-hidden="true"></div>
        <button id="profileBtn" aria-haspopup="true" aria-expanded="false">
          ${u ? `${u.name} (${u.role}) ▾` : 'Not signed in ▾'}
        </button>
        <div id="profileMenu" class="menu" role="menu" aria-label="Profile">
          ${u ? `
            <a href="#/profile" role="menuitem">My Profile</a>
            <a href="#" id="logout" role="menuitem">Logout</a>
          ` : `
            <a href="#/login" role="menuitem">Sign in</a>
            <a href="#/register" role="menuitem">Register (patient)</a>
          `}
        </div>
      </div>
    `;
    const btn = node.querySelector('#profileBtn');
    const menu = node.querySelector('#profileMenu');
    btn.onclick = ()=>{
      const open = menu.style.display==='block';
      menu.style.display = open ? 'none' : 'block';
      btn.setAttribute('aria-expanded', String(!open));
    };
    document.addEventListener('click', (e)=>{
      if(!menu.contains(e.target) && !btn.contains(e.target)){
        menu.style.display='none'; btn.setAttribute('aria-expanded','false');
      }
    });
    const lo = node.querySelector('#logout');
    if (lo) lo.onclick = async (e)=>{ e.preventDefault(); await store.logout(); location.hash = '#/login'; };
  }
  render();
  document.addEventListener('state:change', render);
}
