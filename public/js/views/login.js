import { store } from '../state/store.js';

export function renderLogin(root){
  root.innerHTML = `
    <section class="panel" style="max-width:520px;margin:4rem auto">
      <h2>Sign in</h2>
      <form id="loginForm" style="margin-top:.8rem">
        <div class="tools">
          <input id="email" type="email" placeholder="you@example.com" required>
          <input id="pwd" type="password" placeholder="Password" required>
          <button class="primary" type="submit">Sign in</button>
        </div>
        <p id="err" class="muted" role="alert" aria-live="polite"></p>
      </form>
      <p class="muted" style="margin-top:.6rem">
        New patient? <a href="#/register">Create an account</a>
      </p>
      <details class="muted" style="margin-top:.6rem">
        <summary>Demo credentials</summary>
        Doctor: dr@demo.test / demo<br>
        Admin: admin@demo.test / demo<br>
        Staff: staff@demo.test / demo<br>
        Patient: patient@demo.test / demo
      </details>
    </section>
  `;

  const form = root.querySelector('#loginForm');
  const err  = root.querySelector('#err');
  form.onsubmit = async (e)=>{
    e.preventDefault();
    err.textContent = '';
    const ok = await store.login(form.email.value.trim(), form.pwd.value);
    if (!ok.ok){ err.textContent = ok.error || 'Sign in failed'; return; }

    // route by role
    const role = store.user?.role;
    location.hash = role === 'patient' ? '#/overview' : '#/dashboard';
  };
}
