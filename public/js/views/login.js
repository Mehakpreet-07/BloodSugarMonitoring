import { store } from '../state/store.js';
import { resendActivation } from '../api/auth.js';

export function renderLogin(root){
  root.innerHTML = `
    <section class="panel" style="max-width:520px;margin:4rem auto">
      <h2>Sign in</h2>
      <form id="loginForm" style="margin-top:.8rem">
        <div class="tools">
          <input id="email" type="email" placeholder="you@example.com" required>
          <input id="pwd" type="password" placeholder="Password" autocomplete="current-password" required>
          <button class="primary" type="submit">Sign in</button>
        </div>
        <p id="err" class="muted" role="alert" aria-live="polite"></p>
        <button type="button" id="resend" class="primary" style="margin-top:.4rem; display:none">
          Resend activation email
        </button>
      </form>
      <p class="muted" style="margin-top:.6rem">
        New patient? <a href="#/register">Create an account</a>
      </p>
      <details class="muted" style="margin-top:.6rem">
        <summary>Demo credentials</summary>
        Specialist: dr@demo.test / demo<br>
        Admin: admin@demo.test / demo<br>
        Staff: staff@demo.test / demo<br>
        Patient: patient@demo.test / demo
      </details>
    </section>
  `;

  const form = root.querySelector('#loginForm');
  const err  = root.querySelector('#err');
  const resendBtn = root.querySelector('#resend');

  form.onsubmit = async e=>{
    e.preventDefault();
    err.textContent = '';
    resendBtn.style.display = 'none';

    const ok = await store.login(form.email.value.trim(), form.pwd.value);
    if (!ok.ok){
      const message = ok.error || 'Sign in failed';
      err.textContent = message;

      if (message.toLowerCase().includes('activate')) {
        resendBtn.style.display = 'inline-block';
      }
      return;
    }

    const role = store.user?.role;
    location.hash = role === 'patient' ? '#/overview' : '#/dashboard';
  };

  resendBtn.onclick = async ()=>{
    const email = form.email.value.trim();
    if (!email) {
      err.textContent = 'Enter your email above first.';
      return;
    }
    const res = await resendActivation(email);
    if (!res.ok){
      err.textContent = res.error || 'Could not resend activation email.';
    } else {
      err.textContent = `Activation email sent (${res.count}/3).`;
    }
  };
}