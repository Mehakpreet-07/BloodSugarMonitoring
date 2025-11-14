import { registerPatient } from '../api/auth.js';

export function renderRegister(root){
  root.innerHTML = `
    <section class="panel" style="max-width:560px;margin:3rem auto">
      <h2>Create patient account</h2>
      <form id="regForm" style="margin-top:.8rem">
        <div class="tools">
          <input id="name" type="text" placeholder="Full name" required>
          <input id="email" type="email" placeholder="you@example.com" required>
          <input id="pwd" type="password" placeholder="Password" minlength="4" required>
          <input id="pwd2" type="password" placeholder="Confirm password" minlength="4" required>
          <button class="primary" type="submit">Register</button>
        </div>
        <p id="err" class="muted" role="alert" aria-live="polite"></p>
      </form>
      <p class="muted" style="margin-top:.6rem">Already have an account? <a href="#/login">Sign in</a></p>
    </section>
  `;

  const f = root.querySelector('#regForm');
  const err = root.querySelector('#err');

  f.onsubmit = async e=>{
    e.preventDefault();
    err.textContent = '';
    if (f.pwd.value !== f.pwd2.value){ err.textContent = 'Passwords do not match'; return; }

    const res = await registerPatient({
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      password: f.pwd.value
    });
    if (!res.ok){ err.textContent = res.error || 'Registration failed'; return; }
    err.textContent = 'Account created. Please sign in.';
    setTimeout(()=> location.hash = '#/login', 600);
  };
}
