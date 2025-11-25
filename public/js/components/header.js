// public/js/components/header.js
import { store } from '../state/store.js';
import { mountBell } from './bell.js';

export function mountHeader(node){
  function render(){
    const u = store.user;
    
    // Handle both 'fullName' and 'name'
    const displayName = u ? (u.fullName || u.name || 'User') : '';
    
    // Use profile image or fallback
    const avatarUrl = u?.profileImage 
        ? u.profileImage 
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random`;

    node.innerHTML = `
      <div class="crumbs" id="crumbs"></div>
      <div style="display:flex;align-items:center;gap:.75rem">
        <div id="bellSlot"></div>
        <div class="avatar">
          <img src="${u ? avatarUrl : ''}" class="pic" style="object-fit:cover; display:${u ? 'block' : 'none'}; border-radius:50%; width:36px; height:36px; border:1px solid var(--line)">
          
          <button id="profileBtn" aria-haspopup="true" aria-expanded="false" style="font-weight:600; font-size:0.9rem">
            ${u ? `${displayName} (${u.role}) ▾` : 'Not signed in ▾'}
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

    const btn  = node.querySelector('#profileBtn');
    const menu = node.querySelector('#profileMenu');
    
    if(btn) {
        btn.onclick = (e)=>{
            e.stopPropagation();
            const open = menu.style.display === 'block';
            menu.style.display = open ? 'none' : 'block';
            btn.setAttribute('aria-expanded', String(!open));
        };
    }

    document.addEventListener('click', e=>{
      if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.style.display = 'none';
        if(btn) btn.setAttribute('aria-expanded', 'false');
      }
    });

    const lo = node.querySelector('#logout');
    if (lo) lo.onclick = async e=>{
      e.preventDefault();
      await store.logout();
      location.hash = '#/login';
    };

    // FIX: Mount bell ONLY for Clinical Roles (Patient & Specialist)
    // Admins and Staff should NOT see clinical alerts (SRS Privacy)
    const bellSlot = node.querySelector('#bellSlot');
    if (u && (u.role === 'patient' || u.role === 'specialist')) {
      mountBell(bellSlot);
    } else {
      bellSlot.innerHTML = '';
    }
  }

  render();
  document.addEventListener('state:change', render);
}