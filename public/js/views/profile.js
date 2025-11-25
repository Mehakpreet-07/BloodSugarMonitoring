import { store } from '../state/store.js';

export function renderProfile(root) {
  const user = store.user;
  
  if (!user) {
    root.innerHTML = '<p>Please log in.</p>';
    return;
  }

  const displayName = user.fullName || user.name || 'User';
  const imgSrc = user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  root.innerHTML = `
    <section class="panel" style="max-width:600px; margin:0 auto; text-align:center">
      <div style="margin:1.5rem 0">
        <img src="${imgSrc}" alt="Profile" style="width:100px; height:100px; border-radius:50%; border:4px solid var(--line); object-fit:cover">
        <h2 style="margin:0.5rem 0 0">${displayName}</h2>
        <span class="badge b-ok" style="text-transform:capitalize">${user.role}</span>
      </div>

      <form id="profileForm" style="text-align:left">
        <div class="grid two" style="grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem">
          <label style="display:block">
            <span class="muted" style="font-size:.85rem">Email</span>
            <input id="pEmail" type="email" class="tools" style="width:100%; margin-top:.25rem" value="${user.email}" disabled required>
          </label>
          
          <label style="display:block">
            <span class="muted" style="font-size:.85rem">Phone</span>
            <input id="pPhone" type="tel" class="tools" style="width:100%; margin-top:.25rem" value="${user.phone || ''}" maxlength="14" disabled required>
          </label>
        </div>

        <div class="grid two" style="grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem">
           <label style="display:block">
            <span class="muted" style="font-size:.85rem">Health Care #</span>
            <input id="pHC" type="text" class="tools" style="width:100%; margin-top:.25rem" value="${user.healthCareNumber || ''}" maxlength="11" disabled required>
          </label>
           <label style="display:block">
            <span class="muted" style="font-size:.85rem">Date of Birth</span>
            <input id="pDob" type="date" class="tools" style="width:100%; margin-top:.25rem" value="${user.dateOfBirth ? user.dateOfBirth.split('T')[0] : ''}" disabled required>
          </label>
        </div>

        <div class="grid two" style="grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem">
             <label style="display:block">
                <span class="muted" style="font-size:.85rem">Preferred Unit</span>
                <select id="pUnit" class="tools" style="width:100%; margin-top:.25rem" disabled>
                    <option value="mg/dL" ${user.preferredUnit === 'mg/dL' ? 'selected' : ''}>mg/dL</option>
                    <option value="mmol/L" ${user.preferredUnit === 'mmol/L' ? 'selected' : ''}>mmol/L</option>
                </select>
            </label>
            
            <label style="display:block">
                <span class="muted" style="font-size:.85rem">Profile Image URL</span>
                <input id="pImg" type="url" class="tools" style="width:100%; margin-top:.25rem" value="${user.profileImage || ''}" placeholder="https://..." disabled>
            </label>
        </div>

        <label style="display:block; margin-bottom:1rem; border-top:1px solid #eee; padding-top:1rem">
            <span class="muted" style="font-size:.85rem">Change Password (Optional)</span>
            <input id="pPwd" type="password" class="tools" style="width:100%; margin-top:.25rem" placeholder="Enter new password to change" disabled>
        </label>

        <div style="margin-top:1.5rem; text-align:right">
            <button type="button" id="editBtn">Edit Profile</button>
            <button type="submit" id="saveBtn" class="primary" style="display:none">Save Changes</button>
        </div>
        <p id="pMsg" class="muted" style="text-align:center; margin-top:0.5rem; color:var(--bad)"></p>
      </form>
    </section>
  `;

  const form = root.querySelector('#profileForm');
  const editBtn = root.querySelector('#editBtn');
  const saveBtn = root.querySelector('#saveBtn');
  const msg = root.querySelector('#pMsg');
  const inputs = ['pEmail', 'pPhone', 'pHC', 'pDob', 'pImg', 'pUnit', 'pPwd'].map(id => root.querySelector('#'+id));
  
  const dobInput = root.querySelector('#pDob');
  const today = new Date().toISOString().split('T')[0];
  dobInput.setAttribute('max', today);
  dobInput.setAttribute('min', '1900-01-01');

  const hcInput = root.querySelector('#pHC');
  hcInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 9) v = v.slice(0, 9);
    if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
    e.target.value = v;
  });

  const phoneInput = root.querySelector('#pPhone');
  phoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 10) v = v.slice(0, 10);
    if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
    e.target.value = v;
  });

  editBtn.onclick = () => {
      inputs.forEach(i => i.disabled = false);
      editBtn.style.display = 'none';
      saveBtn.style.display = 'inline-block';
      msg.textContent = 'You can now edit your details.';
      msg.style.color = 'var(--muted)';
  };

  form.onsubmit = async (e) => {
      e.preventDefault();
      msg.textContent = 'Saving...';
      
      // Role-Based Logic
      if (user.role === 'patient') {
         const hcRaw = hcInput.value.replace(/-/g, '');
         if (hcRaw.length !== 9) {
             msg.textContent = "Health Care Number must be 9 digits.";
             msg.style.color = "red";
             return;
         }
      }
      
      const payload = {
          email: root.querySelector('#pEmail').value,
          phone: phoneInput.value,
          healthCareNumber: hcInput.value,
          dateOfBirth: dobInput.value,
          profileImage: root.querySelector('#pImg').value,
          preferredUnit: root.querySelector('#pUnit').value,
          password: root.querySelector('#pPwd').value // Send new password
      };
      
      const r = await fetch(`/api/auth/profile`, {
          method: 'PUT',
          headers: { 
              'Content-Type': 'application/json',
              'x-csrf-token': store.csrfToken 
          },
          body: JSON.stringify(payload)
      });

      if (r.ok) {
          msg.textContent = 'Saved ✓. Please re-login.';
          msg.style.color = 'var(--ok)';
          inputs.forEach(i => i.disabled = true);
          saveBtn.style.display = 'none';
          editBtn.style.display = 'inline-block';
          root.querySelector('#pPwd').value = ''; // Clear password field
      } else {
          const d = await r.json();
          msg.textContent = d.error || 'Error saving profile.';
          msg.style.color = 'var(--bad)';
      }
  };
}