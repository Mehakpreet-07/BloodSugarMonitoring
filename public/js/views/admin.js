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
                                        <td>${u.role !== 'admin' ? `<button class="del-btn" data-role="${u.role}" data-id="${u.id}" style="color:red;border:1px solid red;border-radius:4px;cursor:pointer">Del</button>` : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="panel" style="position:sticky; top:1rem">
                    <h3>Create Professional Account</h3>
                    <form id="createForm" style="display:grid; gap:0.8rem; margin-top:1rem">
                        <select id="newRole" style="width:100%"><option value="specialist">Specialist</option><option value="staff">Staff</option></select>
                        <input id="newName" placeholder="Full Name" required style="width:100%">
                        <input id="newEmail" placeholder="Email" required style="width:100%">
                        <input id="newPhone" placeholder="Phone" required style="width:100%">
                        <input id="newWorkId" placeholder="Working ID" required style="width:100%">
                        <input id="newPwd" type="password" placeholder="Password" required style="width:100%">
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
                <div id="repOutput" style="margin-top:1rem; display:none; padding:1rem; border:1px solid #ddd"></div>
            </section>
        </div>

        <div id="viewLogs" style="display:none">
            <section class="panel">
                <h3>Audit Logs</h3>
                <table class="list">
                    <thead><tr><th>Time</th><th>Action</th><th>Details</th></tr></thead>
                    <tbody>
                        ${logs.slice(0,20).map(l => `<tr><td>${new Date(l.createdAt).toLocaleString()}</td><td>${l.actionType}</td><td>${l.details}</td></tr>`).join('')}
                    </tbody>
                </table>
            </section>
        </div>
    `;

    // Tab Switching
    const tabs = { tabUsers: 'viewUsers', tabReports: 'viewReports', tabLogs: 'viewLogs' };
    Object.keys(tabs).forEach(btnId => {
        root.querySelector('#'+btnId).onclick = () => {
            Object.keys(tabs).forEach(k => {
                root.querySelector('#'+k).classList.remove('primary');
                document.getElementById(tabs[k]).style.display = 'none';
            });
            root.querySelector('#'+btnId).classList.add('primary');
            document.getElementById(tabs[btnId]).style.display = 'block';
        };
    });

    // Delete User
    root.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            if(!confirm('Delete User?')) return;
            const role = btn.getAttribute('data-role');
            const id = btn.getAttribute('data-id');
            await fetch(`/api/admin/users/${role}/${id}`, { method: 'DELETE', headers: {'x-csrf-token': store.csrfToken} });
            renderAdmin(root);
        };
    });

    // Create User
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
        const res = await fetch('/api/admin/create', { method:'POST', headers:{'Content-Type':'application/json', 'x-csrf-token':store.csrfToken}, body:JSON.stringify(payload)});
        if(res.ok) renderAdmin(root);
        else root.querySelector('#formMsg').textContent = 'Error creating user';
    };
    
    // Report
    root.querySelector('#repForm').onsubmit = async (e) => {
        e.preventDefault();
        const start = root.querySelector('#repStart').value;
        const end = root.querySelector('#repEnd').value;
        const r = await fetch('/api/reports', { method:'POST', headers:{'Content-Type':'application/json', 'x-csrf-token':store.csrfToken}, body:JSON.stringify({periodStart:start, periodEnd:end}) });
        const d = await r.json();
        const out = document.getElementById('repOutput');
        out.style.display = 'block';
        if(d.ok) out.innerHTML = `<strong>Report Generated:</strong> ${d.report.numberOfPatients} Patients Active.`;
        else out.textContent = d.error;
    };
}