export function mountHeader(node){
  node.innerHTML = `
    <div class="crumbs">Dashboard</div>
    <div class="avatar">
      <div class="pic" aria-hidden="true"></div>
      <button id="profileBtn" aria-haspopup="true" aria-expanded="false">Dr. A. Sharma ▾</button>
      <div id="profileMenu" class="menu" role="menu" aria-label="Profile">
        <a href="#" role="menuitem">My Profile</a>
        <a href="#" role="menuitem">Logout</a>
      </div>
    </div>
  `;
  const btn = node.querySelector('#profileBtn');
  const menu = node.querySelector('#profileMenu');
  btn.addEventListener('click', ()=>{
    const open = menu.style.display==='block';
    menu.style.display = open? 'none':'block';
    btn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', (e)=>{
    if(!menu.contains(e.target) && !btn.contains(e.target)){
      menu.style.display='none'; btn.setAttribute('aria-expanded','false');
    }
  });
}
