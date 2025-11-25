import { store } from '../state/store.js';

export async function renderAdmin(root) {
    if (store.user?.role !== 'admin') {
        root.innerHTML = '<p>Access Forbidden</p>';
        return;
    }

    const [usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/users').then(r=>r.json()),
        fetch('/api/audit-logs').then(r=>r.json())
    ]);

    const users = usersRes.users || [];
    const logs = logsRes.logs || [];

    root.innerHTML = `
        <div class="tools" style="margin-bottom:1rem">
            <button id="tabUsers" class="primary">User Management</button>
            <button id="tabReports">Reports</button>
            <button id="tabLogs">Audit Logs</button>
        </div>

        <div id="viewUsers">
            <div class="grid two" style="gap:1.5rem; align-items:start">
                <section class="panel">
                    <h3>All Users</h3>
                    <div style="overflow-x:auto">
                        <table class="list">
                            <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Action</th></tr></thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td><span class="badge">${u.role}</span></td>
                                        <td>${u.fullName}</td>
                                        <td>${u.email}</td>
                                        <td>
                                            ${u.role !== 'admin' ? `<button class="del-btn" data-role="${u.role}" data-id="${u.id}" style="color:red;border:1px solid red;background:white;border-radius:4px;cursor:pointer;padding:2px 6px">Delete</button>` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="panel" style="position:sticky; top:1rem">
                    <h3>Create Professional Account</h3>
                    <form id="createForm" style="display:grid; gap:0.8rem; margin-top:1rem">
                        <label><span class="muted">Role</span>
                            <select id="newRole" style="width:100%">
                                <option value="specialist">Specialist (Doctor)</option>
                                <option value="staff">Clinic Staff</option>
                            </select>
                        </label>
                        <input id="newName" placeholder="Full Name" required style="width:100%">
                        <input id="newEmail" type="email" placeholder="Email Address" required style="width:100%">
                        <input id="newPhone" type="tel" placeholder="Phone (XXX-XXX-XXXX)" maxlength="14" required style="width:100%">
                        <input id="newWorkId" placeholder="Working ID" required style="width:100%">
                        <input id="newSpec" placeholder="Specialization (Doctors only)" style="width:100%">
                        <input id="newPwd" type="password" placeholder="Password" required style="width:100%">
                        <button class="primary" type="submit">Create Account</button>
                        <p id="formMsg" class="muted"></p>
                    </form>
                </section>
            </div>
        </div>

        <div id="viewReports" style="display:none">
            <section class="panel">
                <h3>Generate Clinic Report</h3>
                <form id="repForm" class="tools" style="margin-bottom:1.5rem">
                    <label>Start: <input type="date" id="repStart" required></label>
                    <label>End: <input type="date" id="repEnd" required></label>
                    <button class="primary">Generate Analysis</button>
                </form>
                <div id="repOutput" style="display:none; margin-top:1rem"></div>
            </section>
        </div>

        <div id="viewLogs" style="display:none">
            <section class="panel">
                <h3>System Audit Logs</h3>
                <div style="overflow-x:auto; max-height:500px; overflow-y:auto">
                    <table class="list">
                        <thead><tr><th>Time</th><th>Action</th><th>Details</th><th>Actor</th></tr></thead>
                        <tbody>
                            ${logs.map(l => `
                                <tr>
                                    <td style="font-size:0.8rem; white-space:nowrap">${new Date(l.createdAt).toLocaleString()}</td>
                                    <td><strong>${l.actionType}</strong></td>
                                    <td>${l.details}</td>
                                    <td><span class="badge">${l.actorType}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    `;

    // --- LOGIC ---

    const phoneInput = root.querySelector('#newPhone');
    phoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, ''); 
        if (v.length > 10) v = v.slice(0, 10);
        if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
        else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
        e.target.value = v;
    });

    const tabs = { tabUsers: 'viewUsers', tabReports: 'viewReports', tabLogs: 'viewLogs' };
    Object.keys(tabs).forEach(btnId => {
        root.querySelector('#'+btnId).onclick = () => {
            Object.keys(tabs).forEach(id => {
                root.querySelector('#'+id).classList.remove('primary');
                document.getElementById(tabs[id]).style.display = 'none';
            });
            root.querySelector('#'+btnId).classList.add('primary');
            document.getElementById(tabs[btnId]).style.display = 'block';
        };
    });

    root.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            if(!confirm('Delete user?')) return;
            const role = btn.getAttribute('data-role');
            const id = btn.getAttribute('data-id');
            await fetch(`/api/admin/users/${role}/${id}`, { method: 'DELETE', headers: {'x-csrf-token': store.csrfToken} });
            renderAdmin(root);
        };
    });

    root.querySelector('#createForm').onsubmit = async (e) => {
        e.preventDefault();
        const msg = root.querySelector('#formMsg');
        msg.textContent = 'Creating...';
        
        const payload = {
            role: root.querySelector('#newRole').value,
            fullName: root.querySelector('#newName').value,
            email: root.querySelector('#newEmail').value,
            phone: phoneInput.value,
            workingID: root.querySelector('#newWorkId').value,
            specialization: root.querySelector('#newSpec').value,
            password: root.querySelector('#newPwd').value
        };

        const res = await fetch('/api/admin/create', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json', 'x-csrf-token': store.csrfToken}, 
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            msg.textContent = 'Success!';
            renderAdmin(root);
        } else {
            const d = await res.json();
            msg.textContent = d.error || 'Error creating user';
        }
    };

    // FIX: Intelligent Report Display
    root.querySelector('#repForm').onsubmit = async (e) => {
        e.preventDefault();
        const start = root.querySelector('#repStart').value;
        const end = root.querySelector('#repEnd').value;
        const out = document.getElementById('repOutput');
        out.style.display = 'block';
        out.innerHTML = 'Loading...';

        const r = await fetch('/api/reports', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json', 'x-csrf-token': store.csrfToken}, 
            body: JSON.stringify({ periodStart: start, periodEnd: end, reportType: 'Custom' }) 
        });
        const d = await r.json();
        
        if(d.ok) {
            const rep = d.report;
            const triggers = rep.foodActivityTriggers?.topTriggersHigh || [];
            
            // Logic: Green if no triggers, Orange if triggers found
            const hasBadPatterns = triggers.length > 0;
            const boxColor = hasBadPatterns ? '#fff7ed' : '#f0fdf4'; // Orange vs Green
            const borderColor = hasBadPatterns ? '#ffedd5' : '#bbf7d0';
            const textColor = hasBadPatterns ? '#9a3412' : '#166534';
            const icon = hasBadPatterns ? '⚠️' : '✅';
            const title = hasBadPatterns ? 'Top High Glucose Triggers' : 'AI Analysis';

            out.innerHTML = `
                <div style="background:#f8fafc; padding:1.5rem; border-radius:12px; border:1px solid var(--line)">
                    <h4 style="margin:0 0 1rem 0; border-bottom:1px solid #e2e8f0; padding-bottom:0.5rem">
                        Report Summary (${rep.periodStart.split('T')[0]} to ${rep.periodEnd.split('T')[0]})
                    </h4>
                    
                    <div class="grid two" style="gap:2rem; margin-bottom:1.5rem">
                        <div>
                            <div class="muted" style="font-size:0.85rem">Active Patients</div>
                            <div style="font-size:1.8rem; font-weight:bold; color:var(--accent)">${rep.numberOfPatients}</div>
                        </div>
                        <div>
                            <div class="muted" style="font-size:0.85rem">Clinic Avg Glucose</div>
                            <div style="font-size:1.8rem; font-weight:bold">${rep.avgBloodSugarMg || 0} <span style="font-size:1rem; color:#666">mg/dL</span></div>
                        </div>
                    </div>

                    <div class="grid two" style="gap:1rem; margin-bottom:1.5rem; background:white; padding:1rem; border-radius:8px; border:1px solid #eee">
                        <div><strong>Max:</strong> ${rep.maxBloodSugarMg || 0} mg/dL</div>
                        <div><strong>Min:</strong> ${rep.minBloodSugarMg || 0} mg/dL</div>
                        <div><strong>Total Readings:</strong> ${rep.totalReadings}</div>
                    </div>

                    <div style="background:${boxColor}; padding:1rem; border-radius:8px; border:1px solid ${borderColor}">
                        <h5 style="margin:0 0 0.5rem 0; color:${textColor}">${icon} ${title}</h5>
                        ${hasBadPatterns ? `
                            <ul style="margin:0; padding-left:1.2rem; color:${textColor}">
                                ${triggers.map(t => `<li><strong>${t.trigger}</strong> (${t.correlation}%)</li>`).join('')}
                            </ul>
                        ` : `<p style="margin:0; font-size:0.9rem; color:${textColor}">No adverse patterns detected in this period. Clinic status is stable.</p>`}
                    </div>
                </div>
            `;
        } else {
            out.textContent = d.error;
        }
    };
}