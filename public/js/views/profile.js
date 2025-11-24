import { store } from '../state/store.js';
import { getTemplates, saveTemplates } from '../api/templates.js';

export async function renderEmailTemplates(root){
  const user = store.user;
  
  // FIX: Allow 'staff' role to access this page (SRS 3.1.3.c)
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    root.innerHTML = `
      <section class="panel">
        <h2>Email templates</h2>
        <p class="muted">Access Forbidden.</p>
      </section>
    `;
    return;
  }

  const templates = await getTemplates();

  root.innerHTML = `
    <section class="panel">
      <h2>Email templates</h2>
      <p class="muted" style="margin-top:.4rem">
        Manage system email content. Placeholders like <code>{{name}}</code> are replaced automatically.
      </p>

      <form id="tplForm" style="margin-top:1rem; display:flex; flex-direction:column; gap:1rem">
        ${templates.map(t => `
          <div class="panel" style="padding:0.9rem 1rem; border:1px solid var(--line)">
            <h3 style="margin:0 0 .4rem">${t.name}</h3>
            <label style="display:block; margin-bottom:.4rem">
              <span class="muted" style="font-size:.85rem">Subject</span>
              <input type="text" name="subject-${t.id}" value="${t.subject.replace(/"/g, '&quot;')}" style="width:100%;margin-top:.15rem">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:.85rem">Body</span>
              <textarea name="body-${t.id}" rows="4" style="width:100%;margin-top:.15rem">${t.body}</textarea>
            </label>
          </div>
        `).join('')}
        <div class="tools" style="margin-top:.5rem">
          <button class="primary" type="submit">Save All Changes</button>
          <span id="msg" class="muted"></span>
        </div>
      </form>
    </section>
  `;

  const form = root.querySelector('#tplForm');
  const msg  = root.querySelector('#msg');

  form.onsubmit = async e=>{
    e.preventDefault();
    msg.textContent = 'Saving...';

    const data = templates.map(t => {
      return { 
          ...t, 
          subject: form[`subject-${t.id}`].value,
          body: form[`body-${t.id}`].value 
      };
    });

    await saveTemplates(data);
    msg.textContent = 'Saved ✓';
  };
}