import { store } from '../state/store.js';

export async function renderAdmin(root) {
    if (store.user?.role !== 'admin') {
        root.innerHTML = '<p>Access Forbidden</p>';
        return;
    }

    const [usersRes, logsRes, specialistsRes] = await Promise.all([
        fetch('/api/admin/users').then(r=>r.json()),
        fetch('/api/audit-logs').then(r=>r.json()),
        fetch('/api/admin/users').then(r=>r.json())
    ]);

    const users = usersRes.users || [];
    const logs = logsRes.logs || [];
    const specialists = users.filter(u => u.role === 'specialist');
    const patients = users.filter(u => u.role === 'patient');

    root.innerHTML = `
        <div class="tools" style="margin-bottom:1rem; display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem">
            <div>
                <button id="tabUsers" class="primary">User Management</button>
                <button id="tabAssign">Assign Patients</button>
                <button id="tabReports">Reports</button>
                <button id="tabLogs">Audit Logs</button>
            </div>
            <div style="display:flex; gap:0.5rem">
                <button id="backupBtn" style="background:#4b5563; color:white; border:none; padding:0.5rem 1rem; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:0.5rem">
                    ⬇ Backup Data
                </button>
                <label style="background:#dc2626; color:white; padding:0.5rem 1rem; border-radius:6px; cursor:pointer; display:inline-block; font-size:0.9rem">
                    ⬆ Restore
                    <input type="file" id="restoreInput" accept=".json" style="display:none">
                </label>
            </div>
        </div>

        <div id="viewUsers">
            <div class="grid two" style="gap:1.5rem; align-items:start">
                <section class="panel">
                    <h3>All Users</h3>
                    <p class="muted" style="font-size:0.8rem; margin-bottom:0.5rem">
                        Click <strong>Edit</strong> to modify user details, or <strong>Del</strong> to remove.
                    </p>
                    <div style="overflow-x:auto">
                        <table class="list">
                            <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td><span class="badge">${u.role}</span></td>
                                        <td>${u.fullName}</td>
                                        <td>${u.email}</td>
                                        <td>
                                            ${u.role === 'patient' ? 
                                                `<button class="edit-patient-btn" data-id="${u.id}" style="font-size:0.8rem; margin-right:5px; padding:2px 8px; cursor:pointer; border:1px solid var(--accent); background:var(--accent); color:white; border-radius:4px">Edit All</button>` 
                                                : 
                                                `<button class="save-btn" data-role="${u.role}" data-id="${u.id}" style="font-size:0.8rem; margin-right:5px; padding:2px 6px; cursor:pointer; border:1px solid #ccc; border-radius:4px">Edit</button>`
                                            }
                                            ${u.role !== 'admin' ? `<button class="del-btn" data-role="${u.role}" data-id="${u.id}" style="color:red;border:1px solid red;background:white;border-radius:4px;cursor:pointer;padding:2px 6px">Del</button>` : ''}
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
                        <input id="newWorkId" placeholder="Working ID (e.g. S-101)" required style="width:100%">
                        <input id="newSpec" placeholder="Field of Specialization (Doctors only)" style="width:100%">
                        <input id="newPwd" type="password" placeholder="Password" required style="width:100%">
                        <button class="primary" type="submit">Create Account</button>
                        <p id="formMsg" class="muted"></p>
                    </form>
                </section>
            </div>
        </div>

        <!-- ⭐ PATIENT EDIT MODAL -->
        <div id="editPatientModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center">
            <div class="panel" style="width:90%; max-width:600px; max-height:90vh; overflow-y:auto; padding:2rem">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem">
                    <h3 style="margin:0">Edit Patient Details</h3>
                    <button id="closeModal" style="background:transparent; border:none; font-size:1.5rem; cursor:pointer">&times;</button>
                </div>
                
                <form id="editPatientForm" style="display:grid; gap:1rem">
                    <input type="hidden" id="editPatientId">
                    
                    <label style="display:grid; gap:0.3rem">
                        <span class="muted" style="font-size:0.85rem">Full Name</span>
                        <input id="editFullName" type="text" required style="width:100%">
                    </label>
                    
                    <label style="display:grid; gap:0.3rem">
                        <span class="muted" style="font-size:0.85rem">Email Address</span>
                        <input id="editEmail" type="email" required style="width:100%">
                    </label>
                    
                    <label style="display:grid; gap:0.3rem">
                        <span class="muted" style="font-size:0.85rem">Phone Number</span>
                        <input id="editPhone" type="tel" maxlength="14" required style="width:100%">
                    </label>
                    
                    <label style="display:grid; gap:0.3rem">
                        <span class="muted" style="font-size:0.85rem">Health Care Number</span>
                        <input id="editHealthCare" type="text" maxlength="11" required style="width:100%">
                    </label>
                    
                    <label style="display:grid; gap:0.3rem">
                        <span class="muted" style="font-size:0.85rem">Date of Birth</span>
                        <input id="editDOB" type="date" required style="width:100%">
                    </label>
                    
                    <label style="display:grid; gap:0.3rem">
                        <span class="muted" style="font-size:0.85rem">Profile Image URL</span>
                        <input id="editProfileImage" type="url" placeholder="https://..." style="width:100%">
                    </label>
                    
                    <label style="display:grid; gap:0.3rem">
                        <span class="muted" style="font-size:0.85rem">Preferred Unit</span>
                        <select id="editUnit" style="width:100%">
                            <option value="mg/dL">mg/dL</option>
                            <option value="mmol/L">mmol/L</option>
                        </select>
                    </label>
                    
                    <div style="margin-top:1rem; display:flex; gap:0.5rem; justify-content:flex-end">
                        <button type="button" id="cancelEdit" style="padding:0.6rem 1.5rem; background:#f3f4f6; border:1px solid #d1d5db; border-radius:6px; cursor:pointer">Cancel</button>
                        <button type="submit" class="primary" style="padding:0.6rem 1.5rem">Save Changes</button>
                    </div>
                    
                    <p id="editMsg" class="muted" style="text-align:center"></p>
                </form>
            </div>
        </div>

        <div id="viewAssign" style="display:none">
            <section class="panel">
                <h3>Assign Patients to Specialists</h3>
                <p class="muted" style="margin-bottom:1rem">Manage which specialist is responsible for each patient.</p>
                
                <div style="overflow-x:auto">
                    <table class="list">
                        <thead>
                            <tr>
                                <th>Patient Name</th>
                                <th>Email</th>
                                <th>Assigned Specialist</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="assignBody">
                            ${patients.map(p => {
                                const assignedSpec = specialists.find(s => s.id === p.assignedSpecialistId);
                                return `
                                    <tr>
                                        <td><strong>${p.fullName}</strong></td>
                                        <td>${p.email}</td>
                                        <td>
                                            <select class="assign-select" data-patient-id="${p.id}" style="padding:0.4rem; border-radius:4px">
                                                <option value="">-- None --</option>
                                                ${specialists.map(s => `
                                                    <option value="${s.id}" ${s.id === p.assignedSpecialistId ? 'selected' : ''}>
                                                        ${s.fullName} (${s.fieldOfSpecialization || 'Specialist'})
                                                    </option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td>
                                            <button class="assign-save-btn" data-patient-id="${p.id}" style="padding:4px 10px; border:1px solid var(--accent); background:var(--accent); color:white; border-radius:4px; cursor:pointer">
                                                Update
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>

        <div id="viewReports" style="display:none">
            <section class="panel">
                <h3>Generate Clinic Report</h3>
                <p class="muted" style="margin-bottom:1rem">Analyze population health trends and AI-detected triggers.</p>
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
                <h3>System Audit Logs (Including Deleted Readings)</h3>
                <div class="tools" style="margin-bottom:1rem">
                    <input id="logSearch" placeholder="Filter logs by action, actor, or details..." style="width:100%">
                    <select id="logFilter">
                        <option value="">All Actions</option>
                        <option value="reading_deleted">Deleted Readings</option>
                        <option value="reading_updated">Updated Readings</option>
                        <option value="user_deleted">Deleted Users</option>
                        <option value="password_reset">Password Resets</option>
                    </select>
                </div>
                <div style="overflow-x:auto; max-height:500px; overflow-y:auto">
                    <table class="list" id="logTable">
                        <thead><tr><th>Time</th><th>Action</th><th>Details</th><th>Actor</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </section>
        </div>
    `;

    // --- LOGIC & EVENT HANDLERS ---

    // Backup Data
    root.querySelector('#backupBtn').onclick = async () => {
        try {
            const r = await fetch('/api/admin/backup');
            const d = await r.json();
            if(!d.ok) throw new Error(d.error);

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(d.backup, null, 2));
            const node = document.createElement('a');
            node.setAttribute("href", dataStr);
            node.setAttribute("download", "clinic_backup_" + new Date().toISOString().split('T')[0] + ".json");
            document.body.appendChild(node);
            node.click();
            node.remove();
        } catch(e) { alert('Backup failed: ' + e.message); }
    };

    // Restore Data
    root.querySelector('#restoreInput').onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        if(!confirm('WARNING: This will OVERWRITE the entire database with the backup file. Are you sure?')) {
            e.target.value = ''; return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const backupData = JSON.parse(ev.target.result);
                const r = await fetch('/api/admin/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-csrf-token': store.csrfToken },
                    body: JSON.stringify({ backup: backupData })
                });
                const d = await r.json();
                if(d.ok) { alert('System Restored Successfully! Reloading...'); location.reload(); }
                else { alert('Restore failed: ' + d.error); }
            } catch(err) { alert('Invalid Backup File'); }
        };
        reader.readAsText(file);
    };

    // Phone Input Masking
    const phoneInput = root.querySelector('#newPhone');
    phoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 10) v = v.slice(0, 10);
        if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
        else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
        e.target.value = v;
    });

    // Tab Switching
    const tabs = { tabUsers: 'viewUsers', tabAssign: 'viewAssign', tabReports: 'viewReports', tabLogs: 'viewLogs' };
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

    // ⭐ NEW: Edit Patient (All Fields) - Modal
    const modal = root.querySelector('#editPatientModal');
    const editForm = root.querySelector('#editPatientForm');
    const editMsg = root.querySelector('#editMsg');
    
    root.querySelectorAll('.edit-patient-btn').forEach(btn => {
        btn.onclick = async () => {
            const patientId = parseInt(btn.getAttribute('data-id'));
            
            // Fetch full patient details
            const res = await fetch(`/api/patients/${patientId}`);
            const data = await res.json();
            const patient = data.patient;
            
            // Pre-fill form
            root.querySelector('#editPatientId').value = patient.id;
            root.querySelector('#editFullName').value = patient.fullName || '';
            root.querySelector('#editEmail').value = patient.email || '';
            root.querySelector('#editPhone').value = patient.phone || '';
            root.querySelector('#editHealthCare').value = patient.healthCareNumber || '';
            root.querySelector('#editDOB').value = patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '';
            root.querySelector('#editProfileImage').value = patient.profileImage || '';
            root.querySelector('#editUnit').value = patient.preferredUnit || 'mg/dL';
            
            // Show modal
            modal.style.display = 'flex';
        };
    });

    // Close modal handlers
    root.querySelector('#closeModal').onclick = () => modal.style.display = 'none';
    root.querySelector('#cancelEdit').onclick = () => modal.style.display = 'none';

    // Phone masking in edit form
    const editPhoneInput = root.querySelector('#editPhone');
    editPhoneInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 10) v = v.slice(0, 10);
        if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
        else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
        e.target.value = v;
    });

    // HC Number masking in edit form
    const editHCInput = root.querySelector('#editHealthCare');
    editHCInput.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 9) v = v.slice(0, 9);
        if (v.length > 6) v = v.slice(0,3) + '-' + v.slice(3,6) + '-' + v.slice(6);
        else if (v.length > 3) v = v.slice(0,3) + '-' + v.slice(3);
        e.target.value = v;
    });

    // Submit edit form
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        editMsg.textContent = 'Saving...';
        
        const patientId = parseInt(root.querySelector('#editPatientId').value);
        const payload = {
            fullName: root.querySelector('#editFullName').value,
            email: root.querySelector('#editEmail').value,
            phone: root.querySelector('#editPhone').value,
            healthCareNumber: root.querySelector('#editHealthCare').value,
            dateOfBirth: root.querySelector('#editDOB').value,
            profileImage: root.querySelector('#editProfileImage').value,
            preferredUnit: root.querySelector('#editUnit').value
        };
        
        try {
            const res = await fetch(`/api/patients/${patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': store.csrfToken
                },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                editMsg.textContent = 'Saved ✓';
                editMsg.style.color = 'var(--ok)';
                setTimeout(() => {
                    modal.style.display = 'none';
                    renderAdmin(root);
                }, 1500);
            } else {
                const err = await res.json();
                editMsg.textContent = err.error || 'Failed to save';
                editMsg.style.color = 'var(--bad)';
            }
        } catch (err) {
            editMsg.textContent = 'Error: ' + err.message;
            editMsg.style.color = 'var(--bad)';
        }
    };

    // Edit User (Non-patients)
    root.querySelectorAll('.save-btn').forEach(btn => {
        btn.onclick = async () => {
            const role = btn.getAttribute('data-role');
            const id = btn.getAttribute('data-id');
            
            const newName = prompt('Enter new name:');
            const newEmail = prompt('Enter new email:');
            
            if (!newName || !newEmail) return;
            
            btn.textContent = 'Saving...';
            try {
                const res = await fetch(`/api/admin/users/${role}/${id}`, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json', 'x-csrf-token': store.csrfToken},
                    body: JSON.stringify({ fullName: newName, email: newEmail })
                });
                
                if(res.ok) { 
                    btn.textContent = 'Saved ✓'; 
                    setTimeout(() => renderAdmin(root), 1000); 
                } else { 
                    btn.textContent = 'Error'; 
                    alert('Failed to update user.');
                }
            } catch (e) { 
                btn.textContent = 'Error'; 
            }
        };
    });

    // Delete User
    root.querySelectorAll('.del-btn').forEach(btn => {
        btn.onclick = async () => {
            if(!confirm('Delete user? This cannot be undone.')) return;
            const role = btn.getAttribute('data-role');
            const id = btn.getAttribute('data-id');
            await fetch(`/api/admin/users/${role}/${id}`, { method: 'DELETE', headers: {'x-csrf-token': store.csrfToken} });
            renderAdmin(root); 
        };
    });

    // Create User
    root.querySelector('#createForm').onsubmit = async (e) => {
        e.preventDefault();
        const msg = root.querySelector('#formMsg');
        msg.textContent = 'Creating...';
        
        const rawPhone = phoneInput.value.replace(/\D/g, '');
        if (rawPhone.length < 10) {
            msg.textContent = 'Phone number must be 10 digits.';
            msg.style.color = 'red';
            return;
        }
        
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
            msg.style.color = 'green';
            setTimeout(() => renderAdmin(root), 1000); 
        } else {
            const d = await res.json();
            msg.textContent = d.error || 'Error creating user';
            msg.style.color = 'red';
        }
    };

    // Patient Assignment
    root.querySelectorAll('.assign-save-btn').forEach(btn => {
        btn.onclick = async () => {
            const patientId = parseInt(btn.getAttribute('data-patient-id'));
            const select = root.querySelector(`.assign-select[data-patient-id="${patientId}"]`);
            const specialistId = select.value ? parseInt(select.value) : null;

            btn.textContent = 'Saving...';
            
            try {
                const res = await fetch(`/api/patients/${patientId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-csrf-token': store.csrfToken
                    },
                    body: JSON.stringify({ assignedSpecialistId: specialistId })
                });

                if (res.ok) {
                    btn.textContent = 'Updated ✓';
                    setTimeout(() => btn.textContent = 'Update', 2000);
                } else {
                    btn.textContent = 'Error';
                    alert('Failed to assign specialist');
                }
            } catch (e) {
                btn.textContent = 'Error';
                console.error(e);
            }
        };
    });

    // Audit Log Filter
    const logBody = root.querySelector('#logTable tbody');
    const logSearch = root.querySelector('#logSearch');
    const logFilter = root.querySelector('#logFilter');

    const renderLogs = () => {
        const searchTerm = logSearch.value.toLowerCase();
        const filterType = logFilter.value;

        const filtered = logs.filter(l => {
            const matchesSearch = !searchTerm || 
                l.actionType.toLowerCase().includes(searchTerm) || 
                l.details.toLowerCase().includes(searchTerm) || 
                l.actorType.toLowerCase().includes(searchTerm);
            
            const matchesFilter = !filterType || l.actionType === filterType;

            return matchesSearch && matchesFilter;
        });

        logBody.innerHTML = filtered.map(l => {
            const isDeleted = l.actionType === 'reading_deleted' || l.actionType === 'user_deleted';
            const rowStyle = isDeleted ? 'background:#fff3cd; border-left:3px solid var(--warn)' : '';
            
            return `
                <tr style="${rowStyle}">
                    <td style="font-size:0.8rem; white-space:nowrap">${new Date(l.createdAt).toLocaleString()}</td>
                    <td><strong>${l.actionType}</strong></td>
                    <td>${l.details}</td>
                    <td><span class="badge">${l.actorType}</span></td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="4" style="text-align:center">No matching logs</td></tr>';
    };

    renderLogs();
    logSearch.addEventListener('input', renderLogs);
    logFilter.addEventListener('change', renderLogs);

    // Generate Report
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
            
            const hasBadPatterns = triggers.length > 0;
            const boxColor = hasBadPatterns ? '#fff7ed' : '#f0fdf4';
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
                        <div><div class="muted">Active Patients</div><div style="font-size:1.8rem; font-weight:bold; color:var(--accent)">${rep.numberOfPatients}</div></div>
                        <div><div class="muted">Avg Glucose</div><div style="font-size:1.8rem; font-weight:bold">${rep.avgBloodSugarMg || 0}</div></div>
                    </div>

                    <div class="grid two" style="gap:1rem; margin-bottom:1.5rem; background:white; padding:1rem; border-radius:8px; border:1px solid #eee">
                        <div><strong>Max:</strong> ${rep.maxBloodSugarMg || 0} mg/dL</div>
                        <div><strong>Min:</strong> ${rep.minBloodSugarMg || 0} mg/dL</div>
                        <div><strong>Total Readings:</strong> ${rep.totalReadings}</div>
                    </div>

                    <div style="background:${boxColor}; padding:1rem; border-radius:8px; border:1px solid ${borderColor}">
                        <h5 style="margin:0 0 0.5rem 0; color:${textColor}">${icon} ${title}</h5>
                        <ul style="margin:0; padding-left:1.2rem; color:${textColor}">
                            ${hasBadPatterns ? triggers.map(t => `<li><strong>${t.trigger}</strong> (${t.correlation}%)</li>`).join('') : '<li>No adverse patterns detected in this period. Clinic status is stable.</li>'}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            out.textContent = d.error;
        }
    };
}
