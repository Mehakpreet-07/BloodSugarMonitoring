import { registerPatient } from '../api/auth.js';

export function renderRegister(root){
  root.innerHTML = `
    <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem;">
        <section class="panel" style="width: 100%; max-width: 700px; padding: 3rem; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.04);">
          
          <div style="text-align: center; margin-bottom: 2.5rem;">
            <h2 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; color: #111827;">Patient Registration</h2>
            <p class="muted" style="font-size: 1rem; color: #6b7280;">
              Please enter your details exactly as they appear on your Health Card.
            </p>
          </div>
          
          <form id="regForm" class="grid" style="gap: 1.5rem;">
            
            <div class="grid two" style="gap: 1.5rem;">
                <label style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: #374151;">Full Name</span>
                    <input id="name" type="text" required placeholder="John Doe" style="padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem;">
                </label>
                <label style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: #374151;">Health Care Number</span>
                    <input id="hc" type="text" required placeholder="123-456-789" maxlength="11" style="padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem;">
                    <span class="muted" style="font-size: 0.75rem; color: #6b7280;">Format: 3-3-3 (9 digits)</span>
                </label>
            </div>

            <label style="display: flex; flex-direction: column; gap: 0.5rem;">
                <span style="font-size: 0.9rem; font-weight: 600; color: #374151;">Email Address</span>
                <input id="email" type="email" required placeholder="you@example.com" style="padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem;">
            </label>

            <div class="grid two" style="gap: 1.5rem;">
                <label style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: #374151;">Date of Birth</span>
                    <input id="dob" type="date" required min="1900-01-01" style="padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem; font-family: inherit;">
                </label>
                
                <label style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <span style="font-size: 0.9rem; font-weight: 600; color: #374151;">Phone Number</span>
                    <div style="display:flex; gap:0.5rem">
                        <select id="countryCode" style="width: 85px; padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem;">
                            <option value="+1" selected>🇨🇦 +1</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+91">🇮🇳 +91</option>
                            </select>
                        <input id="phone" type="tel" required placeholder="555-123-4567" maxlength="12" style="flex:1; padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem;">
                    </div>
                </label>
            </div>

            <label style="display: flex; flex-direction: column; gap: 0.5rem;">
                <span style="font-size: 0.9rem; font-weight: 600; color: #374151;">Profile Image URL (Optional)</span>
                <input id="img" type="url" placeholder="https://example.com/me.jpg" style="padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem;">
                <span class="muted" style="font-size: 0.75rem; color: #9ca3af;">Leave blank to auto-generate an avatar.</span>
            </label>

            <label style="display: flex; flex-direction: column; gap: 0.5rem;">
                <span style="font-size: 0.9rem; font-weight: 600; color: #374151;">Password</span>
                <input id="pwd" type="password" required minlength="8" placeholder="Min 8 characters" style="padding: 0.85rem; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; font-size: 1rem;">
            </label>

            <button class="primary" type="submit" style="margin-top: 1.5rem; padding: 1rem; font-size: 1.1rem; font-weight: 700; border-radius: 10px; cursor: pointer;">Create Account</button>
          </form>

          <p id="err" class="muted" style="margin-top: 1.5rem; text-align: center; color: #ef4444; min-height: 1.2rem; font-weight: 600;"></p>
          <p class="muted" style="text-align: center; margin-top: 0.5rem; color: #6b7280;">
            Already have an account? <a href="#/login" style="font-weight: 600; color: var(--accent);">Sign in</a>
          </p>
        </section>
    </div>
  `;

  // 1. Date Restrictions (1900 - Today)
  const today = new Date().toISOString().split('T')[0];
  root.querySelector('#dob').setAttribute('max', today);

  // 2. HC Number Masking (XXX-XXX-XXX)
  const hcInput = root.querySelector('#hc');
  hcInput.addEventListener('input', (e) => {
    // Remove non-digits
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 9) v = v.slice(0, 9);
    
    // Add dashes logic
    if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
    
    e.target.value = v;
  });

  // 3. Phone Number Masking (XXX-XXX-XXXX)
  const phoneInput = root.querySelector('#phone');
  phoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 10) v = v.slice(0, 10);

    if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);

    e.target.value = v;
  });

  // 4. Submit
  root.querySelector('#regForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const hcVal = hcInput.value.replace(/-/g, '');
    if (hcVal.length !== 9) {
        root.querySelector('#err').textContent = "Health Care Number must be exactly 9 digits.";
        return;
    }

    const phoneVal = phoneInput.value.replace(/-/g, '');
    if (phoneVal.length !== 10) {
        root.querySelector('#err').textContent = "Phone number must be 10 digits.";
        return;
    }

    // COMBINE Country Code + Phone for backend compliance
    const fullPhone = root.querySelector('#countryCode').value + ' ' + phoneInput.value;

    const payload = {
        name: root.querySelector('#name').value,
        healthCareNumber: hcInput.value,
        email: root.querySelector('#email').value,
        dateOfBirth: root.querySelector('#dob').value,
        phone: fullPhone, // Sends "+1 555-123-4567"
        profileImage: root.querySelector('#img').value || undefined,
        password: root.querySelector('#pwd').value
    };

    const r = await fetch('/api/auth/register', {
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(payload)
    });
    const res = await r.json();
    
    if(res.ok) {
        alert('Account created successfully! You can now sign in.');
        location.hash = '#/login';
    } else {
        root.querySelector('#err').textContent = res.error;
    }
  };
}