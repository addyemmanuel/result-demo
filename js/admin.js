// =============================================
// ADMIN.JS – Role-aware dashboard
// =============================================

// Wait for auth.js to identify the admin
window.addEventListener('adminReady', (e) => {
    const admin = e.detail;
    initAdminPanel(admin);
});

function initAdminPanel(admin) {
    const supabase = window.appSupabase;
    const isSuperAdmin = admin.role === 'super_admin';

    // ---------- ROLE-BASED NAV VISIBILITY ----------
    const hide = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    };
    const show = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    };

    if (!isSuperAdmin) {
        hide('nav-verification');        // lecturers can't verify
        hide('nav-users');               // lecturers can't manage users
        hide('nav-add-student');         // lecturers can't add students
        // Also hide the "Add Student" and "Verification" sections in case they're shown
        const addSec = document.querySelector('a[data-section="add-student"]')?.parentElement;
        if (addSec) addSec.style.display = 'none';
    }

    // Show admin name in header
    const headerActions = document.querySelector('.admin-actions');
    if (headerActions) {
        headerActions.innerHTML = `
            <span style="color:var(--text-secondary);font-size:0.9rem;">
                <i class="fas fa-user-circle"></i>
                ${admin.full_name}
                <span style="color:var(--text-muted);font-size:0.8rem;">(${isSuperAdmin ? 'Super Admin' : 'Lecturer'})</span>
            </span>
        `;
    }

    // ---------- SECTION ROUTING ----------
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.style.display = 'block';
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    const sections = {
        dashboard: document.getElementById('section-dashboard'),
        students: document.getElementById('section-students'),
        'add-student': document.getElementById('section-add-student'),
        results: document.getElementById('section-results'),
        verification: document.getElementById('section-verification'),
        users: document.getElementById('section-users')
    };
    const titles = {
        dashboard: 'Dashboard',
        students: 'Manage Students',
        'add-student': 'Add Student',
        results: 'Result Entry',
        verification: 'Result Verification',
        users: 'User Management'
    };
    const pageTitle = document.getElementById('page-title');

    function showSection(sectionId) {
        // Lecturers cannot access these
        if (!isSuperAdmin && ['add-student', 'verification', 'users'].includes(sectionId)) {
            sectionId = 'dashboard';
        }
        Object.values(sections).forEach(el => el && (el.style.display = 'none'));
        if (sections[sectionId]) sections[sectionId].style.display = 'block';
        navLinks.forEach(link =>
            link.classList.toggle('active', link.dataset.section === sectionId));
        pageTitle.textContent = titles[sectionId] || 'Dashboard';
        sidebar.classList.remove('open');

        if (sectionId === 'dashboard') loadDashboard();
        if (sectionId === 'students') loadStudents();
        if (sectionId === 'verification') loadVerificationQueue();
        if (sectionId === 'users') loadAdminUsers();
    }

    navLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(link.dataset.section);
    }));

    showSection('dashboard');

    // =========================================
    // DASHBOARD (unchanged except we now also count lectures)
    // =========================================
    async function loadDashboard() {
        const cardsContainer = document.getElementById('dash-cards');
        const recentContainer = document.getElementById('recent-students');
        cardsContainer.innerHTML = '<div class="dash-card"><p>Loading...</p></div>';
        try {
            const { data: allStudents, error } = await supabase.from('students').select('level');
            if (error) throw error;

            const total = allStudents.length;
            const nd1 = allStudents.filter(s => s.level === 'ND I').length;
            const nd2 = allStudents.filter(s => s.level === 'ND II').length;
            const hnd1 = allStudents.filter(s => s.level === 'HND I').length;
            const hnd2 = allStudents.filter(s => s.level === 'HND II').length;

            // Pending count for super admin
            let pendingCard = '';
            if (isSuperAdmin) {
                const { data: pending } = await supabase
                    .from('result_sessions').select('id').eq('status', 'Pending');
                pendingCard = `<div class="dash-card" style="border-color:#f59e0b;">
                    <div class="dash-icon" style="color:#f59e0b;"><i class="fas fa-clipboard-check"></i></div>
                    <div class="dash-number">${pending?.length || 0}</div>
                    <div class="dash-label">Pending Verification</div>
                </div>`;
            }

            cardsContainer.innerHTML = `
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-users"></i></div><div class="dash-number">${total}</div><div class="dash-label">Total Students</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-graduate"></i></div><div class="dash-number">${nd1}</div><div class="dash-label">ND I</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-graduate"></i></div><div class="dash-number">${nd2}</div><div class="dash-label">ND II</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-tie"></i></div><div class="dash-number">${hnd1}</div><div class="dash-label">HND I</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-tie"></i></div><div class="dash-number">${hnd2}</div><div class="dash-label">HND II</div></div>
                ${pendingCard}
            `;

            // Recent students
            const { data: recent } = await supabase
                .from('students').select('full_name, uid, level, created_at')
                .order('created_at', { ascending: false }).limit(5);
            recentContainer.innerHTML = recent && recent.length
                ? recent.map(s => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
                    <span><strong>${s.full_name}</strong> (${s.uid})</span>
                    <span style="color:var(--text-muted);">${s.level} • ${new Date(s.created_at).toLocaleDateString()}</span>
                </div>`).join('')
                : 'No students yet.';
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = '<div class="dash-card"><p>Error loading stats.</p></div>';
        }
    }

    // =========================================
    // STUDENTS (unchanged, but delete is super-admin only)
    // =========================================
    async function loadStudents(search = '', level = '') {
        const tbody = document.getElementById('students-tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">Loading...</td></tr>';
        try {
            let query = supabase.from('students').select('*');
            if (search) query = query.or(`full_name.ilike.%${search}%,uid.ilike.%${search}%`);
            if (level) query = query.eq('level', level);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            if (!data || !data.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No students found.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(s => `
                <tr>
                    <td><strong>${s.uid}</strong></td>
                    <td>${s.full_name}</td>
                    <td>${s.level}</td>
                    <td>${s.academic_session || '—'}</td>
                    <td>${s.matric_number || '—'}</td>
                    <td class="actions">
                        <button onclick="editStudent('${s.id}')"><i class="fas fa-edit"></i></button>
                        ${isSuperAdmin ? `<button onclick="deleteStudent('${s.id}')" class="danger"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#b91c1c;">Error loading students.</td></tr>';
        }
    }

    document.getElementById('student-search')?.addEventListener('input', (e) =>
        loadStudents(e.target.value, document.getElementById('student-level-filter').value));
    document.getElementById('student-level-filter')?.addEventListener('change', (e) =>
        loadStudents(document.getElementById('student-search').value, e.target.value));
    document.getElementById('refresh-students')?.addEventListener('click', () =>
        loadStudents(document.getElementById('student-search').value,
                     document.getElementById('student-level-filter').value));

    // ---------- ADD STUDENT (super admin only) ----------
    const addForm = document.getElementById('add-student-form');
    if (addForm && isSuperAdmin) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('add-student-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const full_name = document.getElementById('add-fullname').value.trim();
            const matric_number = document.getElementById('add-matric').value.trim();
            const level = document.getElementById('add-level').value;
            const academic_session = document.getElementById('add-session').value.trim();

            try {
                const uid = await generateUID(level, supabase);
                const { error } = await supabase.from('students').insert([{
                    uid, full_name, matric_number,
                    department: 'Computer Science',
                    level, academic_session,
                    created_by: admin.id
                }]);
                if (error) throw error;

                document.getElementById('new-uid-display').textContent = uid;
                document.getElementById('add-student-result').style.display = 'block';
                addForm.reset();
                document.getElementById('add-session').value = '2025/2026';
            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Generate UID & Save';
            }
        });

        document.getElementById('copy-uid-btn')?.addEventListener('click', () => {
            const text = document.getElementById('new-uid-display').textContent;
            navigator.clipboard.writeText(text).then(() => {
                const b = document.getElementById('copy-uid-btn');
                b.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => b.innerHTML = '<i class="fas fa-copy"></i> Copy', 2000);
            });
        });
    }

    // Global handlers
    window.deleteStudent = async (id) => {
        if (!isSuperAdmin) return alert('Only super admins can delete students.');
        if (!confirm('Delete this student and all their results?')) return;
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) return alert('Delete failed: ' + error.message);
        loadStudents();
        loadDashboard();
    };
    window.editStudent = (id) => alert('Edit student ID: ' + id);

    // =========================================
    // VERIFICATION QUEUE (super admin only)
    // =========================================
    async function loadVerificationQueue() {
        if (!isSuperAdmin) return;
        const tbody = document.getElementById('verification-tbody');
        const status = document.getElementById('verification-status-filter')?.value || 'Pending';
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">Loading...</td></tr>';
        try {
            let query = supabase
                .from('result_sessions')
                .select(`id, academic_year, academic_session, level, status,
                         submitted_at, published_at, entered_by,
                         students ( uid, full_name )`);
            if (status) query = query.eq('status', status);
            const { data, error } = await query.order('submitted_at', { ascending: false, nullsFirst: false });
            if (error) throw error;

            if (!data || !data.length) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">No ${status} results.</td></tr>`;
                return;
            }

            // Fetch admin emails for entered_by
            const userIds = [...new Set(data.map(d => d.entered_by).filter(Boolean))];
            let emailMap = {};
            if (userIds.length) {
                const { data: admins } = await supabase
                    .from('admin_users').select('id, full_name, email').in('id', userIds);
                (admins || []).forEach(a => emailMap[a.id] = a);
            }

            tbody.innerHTML = data.map(session => {
                const s = session.students || {};
                const submitter = session.entered_by ? emailMap[session.entered_by] : null;
                const color = { Draft:'#94a3b8', Pending:'#f59e0b', Published:'#16a34a', Archived:'#64748b' }[session.status] || '#64748b';
                return `
                    <tr>
                        <td>${s.full_name || '—'}</td>
                        <td><strong>${s.uid || '—'}</strong></td>
                        <td>${session.academic_session}</td>
                        <td>${session.level}</td>
                        <td><span style="padding:3px 10px;border-radius:20px;background:${color}20;color:${color};font-weight:600;font-size:0.8rem;">${session.status}</span></td>
                        <td>${session.submitted_at ? formatDate(session.submitted_at) : '—'}<br><small style="color:var(--text-muted);">by ${submitter?.full_name || '—'}</small></td>
                        <td class="actions">
                            <button onclick="viewSession('${session.id}')">View</button>
                            ${session.status === 'Pending' ? `
                                <button onclick="publishSession('${session.id}')" style="background:#16a34a;color:#fff;">Publish</button>
                                <button onclick="rejectSession('${session.id}')" class="danger">Reject</button>
                            ` : ''}
                            ${session.status === 'Published' ? `
                                <button onclick="archiveSession('${session.id}')">Archive</button>
                            ` : ''}
                        </td>
                    </tr>`;
            }).join('');
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#b91c1c;">Error loading queue.</td></tr>';
        }
    }

    document.getElementById('refresh-verification')?.addEventListener('click', loadVerificationQueue);
    document.getElementById('verification-status-filter')?.addEventListener('change', loadVerificationQueue);

    // =========================================
    // USER MANAGEMENT (super admin only)
    // =========================================
    async function loadAdminUsers() {
        if (!isSuperAdmin) return;
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">Loading...</td></tr>';
        const { data, error } = await supabase
            .from('admin_users')
            .select('*')
            .order('created_at', { ascending: false });
        if (error || !data) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#b91c1c;">Error loading users.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(u => `
            <tr>
                <td>${u.full_name}</td>
                <td>${u.email}</td>
                <td><strong>${u.role === 'super_admin' ? 'Super Admin' : 'Lecturer'}</strong></td>
                <td>${u.is_active ? '<span style="color:#16a34a;">● Active</span>' : '<span style="color:#b91c1c;">● Inactive</span>'}</td>
                <td>${formatDate(u.created_at)}</td>
                <td class="actions">
                    ${u.role !== 'super_admin' ? `
                        <button onclick="toggleUserActive('${u.id}', ${u.is_active})">
                            ${u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onclick="deleteAdminUser('${u.id}', '${u.email}')" class="danger">Delete</button>
                    ` : '<em style="color:var(--text-muted);">—</em>'}
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('open-create-user-btn')?.addEventListener('click', () => {
        showModal(`
            <h2>Create New Admin Account</h2>
            <p style="color:var(--text-secondary);margin-bottom:16px;">
                The new user will be able to log in and submit results for verification.
            </p>
            <div class="form-group">
                <label>Full Name</label>
                <input id="cu-name" type="text" placeholder="Jane Lecturer" />
            </div>
            <div class="form-group">
                <label>Email</label>
                <input id="cu-email" type="email" placeholder="lecturer@university.edu" />
            </div>
            <div class="form-group">
                <label>Temporary Password</label>
                <input id="cu-password" type="text" placeholder="min 8 characters" />
            </div>
            <div class="form-group">
                <label>Role</label>
                <select id="cu-role">
                    <option value="lecturer">Lecturer (can upload results)</option>
                    <option value="super_admin">Super Admin (full access)</option>
                </select>
            </div>
            <div id="cu-error" class="error-message" style="display:none;"></div>
        `, [
            { label: 'Cancel', class: 'btn-outline btn-sm', onClick: closeModal },
            { label: 'Create User', class: 'btn-primary btn-sm', onClick: createAdminUser }
        ]);
    });

    async function createAdminUser() {
        const full_name = document.getElementById('cu-name').value.trim();
        const email = document.getElementById('cu-email').value.trim();
        const password = document.getElementById('cu-password').value;
        const role = document.getElementById('cu-role').value;
        const errorEl = document.getElementById('cu-error');
        errorEl.style.display = 'none';

        if (!full_name || !email || password.length < 8) {
            errorEl.textContent = 'Provide a name, valid email, and password (8+ chars).';
            errorEl.style.display = 'block';
            return;
        }

        try {
            // Call Edge Function which uses service role key server-side
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${window.__APP_CONFIG.SUPABASE_URL}/functions/v1/create-admin-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ full_name, email, password, role })
                }
            );
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed');

            alert('✅ User created successfully.');
            closeModal();
            loadAdminUsers();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        }
    }

    window.toggleUserActive = async (id, currentActive) => {
        const { error } = await supabase.from('admin_users')
            .update({ is_active: !currentActive }).eq('id', id);
        if (error) return alert('Failed: ' + error.message);
        loadAdminUsers();
    };

    window.deleteAdminUser = async (id, email) => {
        if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
        // Deactivation is preferred over deletion in production. Here we deactivate.
        const { error } = await supabase.from('admin_users')
            .update({ is_active: false }).eq('id', id);
        if (error) return alert('Failed: ' + error.message);
        alert('User deactivated. Their auth account still exists but they can no longer log in.');
        loadAdminUsers();
    };

    // ---------- global session actions used by verification ----------
    window.publishSession = async (sessionId) => {
        if (!isSuperAdmin) return;
        if (!confirm('Publish this result? Students will see it immediately.')) return;
        const { error } = await supabase.from('result_sessions')
            .update({
                status: 'Published',
                verified_at: new Date().toISOString(),
                verified_by: admin.id,
                published_at: new Date().toISOString()
            }).eq('id', sessionId);
        if (error) return alert('Failed: ' + error.message);
        await logAudit('publish_session', 'result_session', sessionId);
        alert('✅ Published.');
        loadVerificationQueue();
    };

    window.rejectSession = async (sessionId) => {
        if (!isSuperAdmin) return;
        const reason = prompt('Reason for rejection (optional):') || '';
        const { error } = await supabase.from('result_sessions')
            .update({ status: 'Draft', submitted_at: null, rejection_reason: reason })
            .eq('id', sessionId);
        if (error) return alert('Failed: ' + error.message);
        await logAudit('reject_session', 'result_session', sessionId, { reason });
        alert('↩️ Sent back to Draft.');
        loadVerificationQueue();
    };

    window.archiveSession = async (sessionId) => {
        if (!isSuperAdmin) return;
        if (!confirm('Archive this result?')) return;
        const { error } = await supabase.from('result_sessions')
            .update({ status: 'Archived' }).eq('id', sessionId);
        if (error) return alert('Failed: ' + error.message);
        await logAudit('archive_session', 'result_session', sessionId);
        loadVerificationQueue();
    };

    window.viewSession = async (sessionId) => {
        const { data: session } = await supabase
            .from('result_sessions')
            .select('*, students(full_name, uid, level)')
            .eq('id', sessionId).single();
        const { data: courses } = await supabase
            .from('results').select('*')
            .eq('result_session_id', sessionId).order('semester');

        let html = `<h2>Review Result</h2>
            <p style="color:var(--text-secondary);margin-bottom:16px;">
                <strong>${session.students.full_name}</strong> (${session.students.uid})<br>
                ${session.academic_session} • ${session.level} • <strong>${session.status}</strong>
                ${session.rejection_reason ? `<br><em style="color:#b91c1c;">Reason: ${session.rejection_reason}</em>` : ''}
            </p>`;
        if (courses?.length) {
            const bySem = {};
            courses.forEach(c => (bySem[c.semester] = bySem[c.semester] || []).push(c));
            Object.keys(bySem).forEach(sem => {
                html += `<h4 style="margin-top:12px;">${sem}</h4>
                    <table class="admin-table" style="font-size:0.85rem;">
                        <thead><tr><th>Code</th><th>Title</th><th>Units</th><th>Score</th><th>Grade</th><th>GP</th></tr></thead>
                        <tbody>${bySem[sem].map(c => `
                            <tr><td>${c.course_code}</td><td>${c.course_title}</td><td>${c.credit_unit}</td>
                                <td>${c.score}</td><td>${c.grade}</td><td>${c.grade_point.toFixed(1)}</td></tr>`).join('')}
                        </tbody>
                    </table>`;
            });
        }
        showModal(html, [{ label: 'Close', class: 'btn-outline btn-sm', onClick: closeModal }]);
    };

    async function logAudit(action, entity_type, entity_id, details = {}) {
        try {
            await supabase.from('audit_log').insert([{
                actor_id: admin.id, actor_email: admin.email,
                action, entity_type, entity_id, details
            }]);
        } catch (e) { console.warn('audit log failed', e); }
    }

    // Expose for results.js
    window.currentAdminId = admin.id;

    // Refresh pending badge
    if (isSuperAdmin) {
        updatePendingBadge();
        setInterval(updatePendingBadge, 30000);
    }

    async function updatePendingBadge() {
        const badge = document.getElementById('pending-badge');
        if (!badge) return;
        const { data } = await supabase.from('result_sessions').select('id').eq('status', 'Pending');
        if (data?.length) {
            badge.textContent = data.length;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ---------- Modal helpers ----------
function showModal(htmlContent, buttons = []) {
    let modal = document.getElementById('dynamic-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamic-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `<div class="modal-box">
            <div id="dynamic-modal-content"></div>
            <div class="modal-actions" id="dynamic-modal-actions"></div>
        </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('dynamic-modal-content').innerHTML = htmlContent;
    const actions = document.getElementById('dynamic-modal-actions');
    actions.innerHTML = '';
    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.className = btn.class || 'btn-primary btn-sm';
        b.textContent = btn.label;
        b.addEventListener('click', btn.onClick);
        actions.appendChild(b);
    });
    modal.classList.add('active');
}
function closeModal() {
    const m = document.getElementById('dynamic-modal');
    if (m) m.classList.remove('active');
}