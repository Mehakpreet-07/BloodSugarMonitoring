// public/js/views/profile.js
import { store } from '../state/store.js';
import { rowsHtml } from '../components/table.js';

export function renderProfile(root){
  const role = store.user?.role || 'guest';

  if (role === 'doctor') {
    root.innerHTML = `
      <section class="grid two">
        <div class="panel">
          <h2>Short Summary</h2>
          <p class="muted">
            Passionate and detail oriented Diabetologist with 12+ years improving outcomes
            using modern monitoring and personalized plans.
          </p>
        </div>
        <aside class="panel" style="max-width:360px">
          <div style="height:160px;border-radius:12px;background:linear-gradient(135deg,#c8ccff,#f0f1ff);display:flex;align-items:center;justify-content:center;font-weight:700;margin-bottom:.8rem">
            Profile Picture
          </div>
          <h3 style="margin:.2rem 0 0">Dr. Kamal Sharma</h3>
          <p class="muted" style="margin:.15rem 0 .6rem">Diabetologist</p>
          <div class="listwrap">
            <table class="list"><tbody>
              ${rowsHtml([
                ['Full name','Dr. Kamal Sharma'],
                ['Employee ID','D-1456'],
                ['Email','dr.kamal@example.com'],
                ['Phone','+1 234 567 890'],
                ['Date of birth','12 Mar 1982'],
                ['Gender','Male'],
                ['Location','Toronto, Canada']
              ])}
            </tbody></table>
          </div>
        </aside>
      </section>
    `;
    return;
  }

  if (role === 'admin') {
    root.innerHTML = `
      <section class="grid two">
        <aside class="panel" style="max-width:360px">
          <div style="height:260px;border-radius:12px;background:#eef0ff;display:flex;align-items:center;justify-content:center;font-weight:700;margin-bottom:1rem">
            Admin
          </div>
          <h3 class="brand" style="margin:0">Alex Morgan</h3>
          <p class="muted" style="margin:.15rem 0 .6rem">System Administrator</p>
          <div class="listwrap">
            <table class="list"><tbody>
              ${rowsHtml([
                ['Email','admin@example.com'],
                ['Phone','+1 456 789 2345'],
                ['Employee ID','ADM-1021'],
                ['Location','Vancouver, Canada']
              ])}
            </tbody></table>
          </div>
        </aside>

        <div class="panel">
          <h2>About</h2>
          <p class="muted" style="margin-top:.4rem">
            Manages doctor and patient data, scheduling, and platform integrity.
          </p>
        </div>
      </section>
    `;
    return;
  }

  if (role === 'patient') {
    root.innerHTML = `
      <section class="panel">
        <h2>My Profile</h2>
        <p class="muted">Signed in as ${store.user?.name || 'Patient'}.</p>
        <p class="muted">Your clinical details are securely stored and visible only to your care team.</p>
      </section>
    `;
    return;
  }

  root.innerHTML = `
    <section class="panel">
      <h2>Profile</h2>
      <p class="muted">Please sign in first.</p>
      <p><a href="#/login">Go to Sign in</a></p>
    </section>
  `;
}
