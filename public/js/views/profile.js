import { store } from '../state/store.js';

export function renderProfile(root) {
  const user = store.user;
  
  if (!user) {
    root.innerHTML = '<p>Please log in.</p>';
    return;
  }

  root.innerHTML = `
    <section class="panel" style="max-width:600px; margin:0 auto">
      <h2>My Profile</h2>
      
      <div style="display:flex; align-items:center; gap:1rem; margin:1.5rem 0">
        <div style="width:64px; height:64px; background:#eef2f7; border-radius:50%; border:1px solid #dfe6ee"></div>
        <div>
          <h3 style="margin:0">${user.name}</h3>
          <span class="badge b-ok" style="text-transform:capitalize">${user.role}</span>
        </div>
      </div>

      <form id="profileForm">
        <div class="grid two" style="grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem">
          <label style="display:block">
            <span class="muted" style="font-size:.85rem">Full Name</span>
            <input class="tools" style="width:100%; margin-top:.25rem" value="${user.name}" readonly disabled>
          </label>
          
          <label style="display:block">
            <span class="muted" style="font-size:.85rem">Email</span>
            <input class="tools" style="width:100%; margin-top:.25rem" value="${user.email}" readonly disabled>
          </label>
        </div>

        <div class="grid two" style="grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem">
           <label style="display:block">
            <span class="muted" style="font-size:.85rem">User ID</span>
            <input class="tools" style="width:100%; margin-top:.25rem" value="${user.id}" readonly disabled>
          </label>
           <label style="display:block">
            <span class="muted" style="font-size:.85rem">Role</span>
            <input class="tools" style="width:100%; margin-top:.25rem" value="${user.role}" readonly disabled>
          </label>
        </div>

        <p class="muted" style="font-size:0.9rem; margin-top:1.5rem">
          Note: To update your personal details or password, please contact the clinic administrator.
        </p>
      </form>
    </section>
  `;
}