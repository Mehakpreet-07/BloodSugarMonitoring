// public/js/views/emailTemplates.js
import { store } from '../state/store.js';
import { getTemplates, saveTemplates } from '../api/templates.js';
// this function will render the email templates page for admin users to manage email templates
export async function renderEmailTemplates(root){
  const user = store.user;
  if (!user || user.role !== 'admin') {
    root.innerHTML = `
      <section class="panel">
        <h2>Email templates</h2>
        <p class="muted">Only administrators can manage email templates.</p>
      </section>
    `;
    return;
  }
// fetching existing email templates from the server: means api call to get templates
  const templates = await getTemplates();
// setting up the email templates page structure
  root.innerHTML = `
    <section class="panel">
      <h2>Email templates</h2>
      <p class="muted" style="margin-top:.4rem">
        These templates are used for activation emails, high reading alerts, and summaries.
        Placeholders like <code>{{name}}</code> or <code>{{value}}</code> are replaced by real data.
      </p>

      <form id="tplForm" style="margin-top:1rem; display:flex; flex-direction:column; gap:1rem">
        ${templates.map(t => `
          <div class="panel" style="padding:0.9rem 1rem">
            <h3 style="margin:0 0 .4rem">${t.name}</h3>
            <label style="display:block; margin-bottom:.4rem">
              <span class="muted" style="font-size:.85rem">Subject</span><br>
              <input type="text" name="subject-${t.id}" value="${t.subject.replace(/"/g, '&quot;')}" style="width:100%;margin-top:.15rem">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:.85rem">Body</span><br>
              <textarea name="body-${t.id}" rows="5" style="width:100%;margin-top:.15rem">${t.body}</textarea>
            </label>
          </div>
        `).join('')}
        <div class="tools" style="margin-top:.5rem">
          <button class="primary" type="submit">Save templates</button>
          <span id="msg" class="muted"></span>
        </div>
      </form>
    </section>
  `;
// to easily get elements by their id within the root: means the email templates page
  const form = root.querySelector('#tplForm');
  const msg  = root.querySelector('#msg');

  form.onsubmit = async e=>{
    e.preventDefault();
    msg.textContent = '';

    const data = templates.map(t => {
      const subject = form[`subject-${t.id}`].value;
      const body    = form[`body-${t.id}`].value;
      return { ...t, subject, body };
    });

    await saveTemplates(data);
    msg.textContent = 'Saved';
  };
}
