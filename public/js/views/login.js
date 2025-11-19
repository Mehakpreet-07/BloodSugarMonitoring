import { store } from '../state/store.js';
import { resendActivation } from '../api/auth.js';
<<<<<<< HEAD

=======
// this function will render the login page for users to sign in
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
export function renderLogin(root){
  // setting up the login page structure
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
        <button type="button" id="resend" class="primary" style="margin-top:.4rem; display:none">
          Resend activation email
        </button>
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
// to easily get elements by their id within the root: means the login page
  const form = root.querySelector('#loginForm');
  const err  = root.querySelector('#err');
  const resendBtn = root.querySelector('#resend');
<<<<<<< HEAD

=======
// this is the event when the form is submitted
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
  form.onsubmit = async e=>{
    e.preventDefault();
    err.textContent = '';
    resendBtn.style.display = 'none';
<<<<<<< HEAD

=======
// calling the api to log in the user
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
    const ok = await store.login(form.email.value.trim(), form.pwd.value);
    if (!ok.ok){
      const message = ok.error || 'Sign in failed';
      err.textContent = message;
<<<<<<< HEAD

      if (message.toLowerCase().includes('activate')) {
        resendBtn.style.display = 'inline-block';
      }
      return;
    }

    const role = store.user?.role;
    location.hash = role === 'patient' ? '#/overview' : '#/dashboard';
  };

=======

      if (message.toLowerCase().includes('activate')) {
        resendBtn.style.display = 'inline-block';
      }
      return;
    }
// redirecting the user based on their role after successful login
    const role = store.user?.role;
    location.hash = role === 'patient' ? '#/overview' : '#/dashboard';
  };
// this is the event when the resend activation button is clicked
>>>>>>> a0ebb772a05060876390ac037a3fb33d9f953abe
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
