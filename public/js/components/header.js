// public/js/components/header.js
import { store } from '../state/store.js';
import { mountBell } from './bell.js'; //importing notification bell

export function mountHeader(node){ // function fr header and node event tells where the header will appear
  function render(){
    const u = store.user;//contains data like the current user if no one sign in then it null
    // node event that will appear on the screen: telling if sign in or not then what will show 
    //crumbs means the path where the user is like home/profile/settings
    node.innerHTML = `
      <div class="crumbs" id="crumbs"></div>
      <div style="display:flex;align-items:center;gap:.75rem">
        <div id="bellSlot"></div>
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
      </div>
    `;
// this is the fuction when click on the right side where the name and bell are showing when click then drop down list will open
    const btn  = node.querySelector('#profileBtn');
    const menu = node.querySelector('#profileMenu');
    btn.onclick = ()=>{
      const open = menu.style.display === 'block';
      menu.style.display = open ? 'none' : 'block';
      btn.setAttribute('aria-expanded', String(!open));
    };
// when clicked outside the drop down menu then it will close
    document.addEventListener('click', e=>{
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
      }
    });
// when clicked on logout then the login page will come 
    const lo = node.querySelector('#logout');
    if (lo) lo.onclick = async e=>{
      e.preventDefault();
      await store.logout();
      location.hash = '#/login';
    };

    // Mount bell only for signed in users
    const bellSlot = node.querySelector('#bellSlot');
    if (u) {
      mountBell(bellSlot);
    } else {
      bellSlot.innerHTML = '';
    }
  }
// if logout then the header will change its state means it will go to when no one is signed in
  render();
  document.addEventListener('state:change', render);
}
