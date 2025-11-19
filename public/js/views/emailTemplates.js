// public/js/views/emailTemplates.js
import { store } from '../state/store.js';
import { getTemplates, saveTemplates } from '../api/templates.js';
<<<<<<< HEAD

export async function renderEmailTemplates(root){
  const user = store.user;
  const canEdit = user && (user.role === 'admin' || user.role === 'staff');

  if (!canEdit) {
    root.innerHTML = `
      <section class="panel">
        <h2>Email templates</h2>
        <p class="muted">
          Only administrators and clinic staff can manage email templates.
          Please contact the clinic if you need changes.
        </p>
=======
// this function will render the email templates page for admin users to manage email templates
export async function renderEmailTemplates(root){
  const user = store.user;
  if (!user || user.role !== 'admin') {
    root.innerHTML = `
      <section class="panel">
        <h2>Email templates</h2>
        <p class="muted">Only administrators can manage email templates.</p>
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
      </section>
    `;
    return;
  }
<<<<<<< HEAD

  const templates = await getTemplates();

=======
// fetching existing email templates from the server: means api call to get templates
  const templates = await getTemplates();
// setting up the email templates page structure
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
  root.innerHTML = `
    <section class="panel">
      <h2>Email templates</h2>
      <p class="muted" style="margin-top:.4rem">
<<<<<<< HEAD
        These templates are used for activation emails, high reading alerts, and weekly summaries.
        Placeholders like <code>{{name}}</code> or <code>{{value}}</code> are replaced with real data.
=======
        These templates are used for activation emails, high reading alerts, and summaries.
        Placeholders like <code>{{name}}</code> or <code>{{value}}</code> are replaced by real data.
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
      </p>

      <form id="tplForm" style="margin-top:1rem; display:flex; flex-direction:column; gap:1rem">
        ${templates.map(t => `
          <div class="panel" style="padding:0.9rem 1rem">
            <h3 style="margin:0 0 .4rem">${t.name}</h3>
            <label style="display:block; margin-bottom:.4rem">
              <span class="muted" style="font-size:.85rem">Subject</span><br>
<<<<<<< HEAD
              <input type="text"
                     name="subject-${t.id}"
                     value="${t.subject.replace(/"/g, '&quot;')}"
                     style="width:100%;margin-top:.15rem">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:.85rem">Body</span><br>
              <textarea name="body-${t.id}"
                        rows="5"
                        style="width:100%;margin-top:.15rem">${t.body}</textarea>
=======
              <input type="text" name="subject-${t.id}" value="${t.subject.replace(/"/g, '&quot;')}" style="width:100%;margin-top:.15rem">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:.85rem">Body</span><br>
              <textarea name="body-${t.id}" rows="5" style="width:100%;margin-top:.15rem">${t.body}</textarea>
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
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
<<<<<<< HEAD

  const form = root.querySelector('#tplForm');
  const msg  = root.querySelector('#msg');

  form.onsubmit = async e => {
=======
// to easily get elements by their id within the root: means the email templates page
  const form = root.querySelector('#tplForm');
  const msg  = root.querySelector('#msg');

  form.onsubmit = async e=>{
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
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
