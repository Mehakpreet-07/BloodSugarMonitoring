import { store } from '../state/store.js';

export async function renderAdmin(root) {
    if (store.user?.role !== 'admin') {
        root.innerHTML = '<p>Access Forbidden</p>';
        return;
    }

    // Fetch All Data Needed
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
                            <thead><tr><th>Role</th><th>Name</th><th>Action</th></tr></thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td><span class="badge">${u.role}</span></td>
                                        <td>${u.fullName}</td>
                                        <td>${u.role !== 'admin' ? `<button class="del-btn" data-role="${u.role}" data-id="${u.id}" style="color:red;border:1px solid red;border-radius:4px">Del</button>` : ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </section>
                <section class="panel">
                    <h3>Create Account</h3>
                    <form id="createForm" style="display:grid; gap:0.8rem">
                        <select id="newRole">
                            <option value="specialist">Specialist</option>
                            <option value="staff">Staff</option>
                        </select>
                        <input id="newName" placeholder="Full Name" required>
                        <input id="newEmail" placeholder="Email" required>
                        <input id="newPhone" placeholder="Phone" required>
                        <input id="newWorkId" placeholder="Working ID" required>
                        <input id="newPwd" type="password" placeholder="Password" required>
                        <button class="primary">Create</button>
                        <p id="formMsg" class="muted"></p>
                    </form>
                </section>
            </div>
        </div>

        <div id="viewReports" style="display:none">
            <section class="panel">
                <h3>Generate Report</h3>
                <form id="repForm" class="tools">
                    <input type="date" id="repStart" required>
                    <input type="date" id="repEnd" required>
                    <button class="primary">Generate</button>
                </form>
                <div id="repOutput" style="margin-top:1rem; padding:1rem; background:#f8f9fa; border:1px solid #ddd; display:none"></div>
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
                                    <td style="font-size:0.8rem">${new Date(l.createdAt).toLocaleString()}</td>
                                    <td><strong>${l.actionType}</strong></td>
                                    <td>${l.details}</td>
                                    <td>${l.actorType}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    `;

    // Tab Logic
    const tabs = {
        tabUsers: 'viewUsers',
        tabReports: 'viewReports',
        tabLogs: 'viewLogs'
    };

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

    // Report Logic
    root.querySelector('#repForm').onsubmit = async (e) => {
        e.preventDefault();
        const start = root.querySelector('#repStart').value;
        const end = root.querySelector('#repEnd').value;
        
        const r = await fetch('/api/reports', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'x-csrf-token': store.csrfToken},
            body: JSON.stringify({ periodStart: start, periodEnd: end, reportType: 'Custom' })
        });
        const d = await r.json();
        
        const out = document.getElementById('repOutput');
        out.style.display = 'block';
        if(d.ok) {
            const rep = d.report;
            out.innerHTML = `
                <h4>Report Generated (${rep.periodStart.split('T')[0]} to ${rep.periodEnd.split('T')[0]})</h4>
                <p><strong>Total Patients:</strong> ${rep.numberOfPatients}</p>
                <p><strong>Readings Analyzed:</strong> ${rep.totalReadings}</p>
                <p><strong>Avg Glucose:</strong> ${rep.avgBloodSugarMg} mg/dL</p>
                <hr>
                <p><strong>Top Triggers Identified (High Glucose):</strong></p>
                <ul>
                    ${rep.foodActivityTriggers.topTriggersHigh.map(t => `<li>${t.trigger} (${t.correlation}% correlation)</li>`).join('') || '<li>None detected</li>'}
                </ul>
            `;
        } else {
            out.textContent = 'Error: ' + d.error;
        }
    };

    // User Management Logic (Same as before)
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
        const payload = {
            role: root.querySelector('#newRole').value,
            fullName: root.querySelector('#newName').value,
            email: root.querySelector('#newEmail').value,
            phone: root.querySelector('#newPhone').value,
            workingID: root.querySelector('#newWorkId').value,
            password: root.querySelector('#newPwd').value
        };
        const res = await fetch('/api/admin/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'x-csrf-token': store.csrfToken},
            body: JSON.stringify(payload)
        });
        if(res.ok) renderAdmin(root);
        else root.querySelector('#formMsg').textContent = 'Error creating user';
    };
}