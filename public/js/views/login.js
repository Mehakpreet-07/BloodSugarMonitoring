import { store } from '../state/store.js';
import { resendActivation } from '../api/auth.js';

export function renderLogin(root){
  root.innerHTML = `
    <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem;">
      <section class="panel" style="width: 100%; max-width: 450px; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <h2 style="text-align:center; margin-bottom:1.5rem">Sign in</h2>
        
        <form id="loginForm" class="grid" style="gap:1rem">
          <input id="email" type="email" placeholder="Email Address" required style="padding:0.8rem; border-radius:8px; border:1px solid #ddd" autocomplete="username">
          <input id="pwd" type="password" placeholder="Password" required style="padding:0.8rem; border-radius:8px; border:1px solid #ddd" autocomplete="current-password">
          <button class="primary" type="submit" style="padding:0.8rem; font-weight:bold">Sign In</button>
        </form>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem">
            <a href="#" id="forgotBtn" style="font-size:0.85rem; color:var(--muted)">Forgot Password?</a>
        </div>

        <p id="err" class="muted" role="alert" style="margin-top:1rem; color:red; text-align:center; min-height:1.2rem"></p>
        
        <button type="button" id="resend" class="primary" style="margin-top:0.5rem; display:none; width:100%">
          Resend activation email
        </button>

        <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #eee; font-size:0.9rem; color:#666">
          <p>New patient? <a href="#/register" style="color:var(--accent); font-weight:600">Create an account</a></p>
          
          <details style="margin-top:0.5rem; cursor:pointer">
            <summary>View Demo Credentials</summary>
            <div style="margin-top:0.5rem; padding:0.5rem; background:#f9f9f9; border-radius:6px; line-height:1.6">
                <strong>Admin:</strong> admin@demo.test / demo<br>
                <strong>Specialist:</strong> dr@demo.test / demo<br>
                <strong>Staff:</strong> staff@demo.test / demo<br>
                <strong>Patient:</strong> patient@demo.test / demo
            </div>
          </details>
        </div>
      </section>
    </div>
  `;

  const form = root.querySelector('#loginForm');
  const err  = root.querySelector('#err');
  const resendBtn = root.querySelector('#resend');

  // Login Handler
  form.onsubmit = async e => {
    e.preventDefault();
    err.textContent = '';
    resendBtn.style.display = 'none';

    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#pwd').value;

    const ok = await store.login(email, password);
    
    if (!ok.ok){
      err.textContent = ok.error || 'Sign in failed';
      if ((ok.error || '').toLowerCase().includes('activate')) {
        resendBtn.style.display = 'block';
      }
      return;
    }

    // Role Redirects
    const role = store.user?.role;
    if (role === 'admin') location.hash = '#/admin';
    else if (role === 'patient') location.hash = '#/overview';
    else location.hash = '#/dashboard';
  };

  // Password Reset Handler
  root.querySelector('#forgotBtn').onclick = async (e) => {
      e.preventDefault();
      const email = form.querySelector('#email').value.trim();
      if(!email) {
          err.textContent = 'Please enter your email address first.';
          return;
      }
      
      try {
          await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email })
          });
          alert(`Password reset link has been sent to ${email} (Simulated). Check server console.`);
      } catch (e) {
          console.error(e);
      }
  };

  // Activation Handler
  resendBtn.onclick = async ()=>{
    const email = form.querySelector('#email').value.trim();
    const res = await resendActivation(email);
    if (!res.ok) err.textContent = res.error;
    else err.textContent = `Activation sent (${res.count}/3).`;
  };
}