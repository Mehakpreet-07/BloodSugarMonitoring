export function mountSidebar(node, onNav){
  node.innerHTML = `
    <div class="brand">Blood Sugar</div>
    <nav class="nav">
      <a href="#/dashboard" class="active">Dashboard</a>
      <a href="#/patients">Patients</a>
      <a href="#/alerts">Alerts</a>
      <a href="#/settings">Settings</a>
    </nav>
  `;
  node.querySelectorAll('.nav a').forEach(a=>{
    a.addEventListener('click', ()=>{
      node.querySelectorAll('.nav a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active'); onNav(a.getAttribute('href'));
    });
  });
}
