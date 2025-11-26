// public/js/views/resetPassword.js
// Password Reset View

export function renderResetPassword(root) {
  // Get token and email from URL
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const token = params.get('token');
  const email = params.get('email');

  if (!token || !email) {
    root.innerHTML = `
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <section class="panel" style="width: 100%; max-width: 450px; padding: 2.5rem; text-align: center;">
          <h2 style="color: var(--bad);">Invalid Reset Link</h2>
          <p class="muted">This password reset link is invalid or has expired.</p>
          <a href="#/login" style="display: inline-block; margin-top: 1rem; color: var(--accent); font-weight: 600;">Return to Login</a>
        </section>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem;">
      <section class="panel" style="width: 100%; max-width: 450px; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <h2 style="text-align:center; margin-bottom:1.5rem">Reset Password</h2>
        
        <p class="muted" style="text-align: center; margin-bottom: 1.5rem;">
          Enter your new password for <strong>${email}</strong>
        </p>

        <form id="resetForm" class="grid" style="gap:1rem">
          <input id="newPassword" type="password" placeholder="New Password (min 8 characters)" required minlength="8" style="padding:0.8rem; border-radius:8px; border:1px solid #ddd" autocomplete="new-password">
          
          <input id="confirmPassword" type="password" placeholder="Confirm Password" required minlength="8" style="padding:0.8rem; border-radius:8px; border:1px solid #ddd" autocomplete="new-password">
          
          <button class="primary" type="submit" style="padding:0.8rem; font-weight:bold">Reset Password</button>
        </form>

        <p id="err" class="muted" role="alert" style="margin-top:1rem; color:red; text-align:center; min-height:1.2rem"></p>
        
        <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #eee; text-align: center;">
          <a href="#/login" style="color:var(--accent); font-weight:600">Back to Login</a>
        </div>
      </section>
    </div>
  `;

  const form = root.querySelector('#resetForm');
  const err = root.querySelector('#err');

  form.onsubmit = async (e) => {
    e.preventDefault();
    err.textContent = '';

    const newPassword = form.querySelector('#newPassword').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;

    if (newPassword !== confirmPassword) {
      err.textContent = 'Passwords do not match';
      return;
    }

    if (newPassword.length < 8) {
      err.textContent = 'Password must be at least 8 characters';
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword })
      });

      const data = await res.json();

      if (data.ok) {
        err.style.color = 'var(--ok)';
        err.textContent = 'Password reset successful! Redirecting...';
        setTimeout(() => {
          location.hash = '#/login';
        }, 2000);
      } else {
        err.style.color = 'var(--bad)';
        err.textContent = data.error || 'Reset failed';
      }
    } catch (error) {
      err.style.color = 'var(--bad)';
      err.textContent = 'Network error. Please try again.';
    }
  };
}