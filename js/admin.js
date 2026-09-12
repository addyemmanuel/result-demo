// =============================================
// ADMIN.JS – Dashboard, Students, Add Student
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const supabase = window.appSupabase;
    if (!supabase) {
        alert('Supabase client not available. Please check configuration.');
        return;
    }

    // Sidebar toggle (mobile)
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.style.display = 'block';
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // Navigation
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
    const sections = {
        dashboard: document.getElementById('section-dashboard'),
        students: document.getElementById('section-students'),
        'add-student': document.getElementById('section-add-student'),
        results: document.getElementById('section-results')
    };
    const pageTitle = document.getElementById('page-title');

    function showSection(sectionId) {
        Object.values(sections).forEach(el => el.style.display = 'none');
        if (sections[sectionId]) sections[sectionId].style.display = 'block';
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });
        const titles = {
            dashboard: 'Dashboard',
            students: 'Manage Students',
            'add-student': 'Add Student',
            results: 'Result Entry'
        };
        pageTitle.textContent = titles[sectionId] || 'Dashboard';
        sidebar.classList.remove('open');
        if (sectionId === 'dashboard') loadDashboard();
        if (sectionId === 'students') loadStudents();
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(link.dataset.section);
        });
    });
    showSection('dashboard');

    // ---------- DASHBOARD ----------
    async function loadDashboard() {
        const cardsContainer = document.getElementById('dash-cards');
        const recentContainer = document.getElementById('recent-students');
        cardsContainer.innerHTML = '<div class="dash-card"><p>Loading...</p></div>';

        try {
            const { data: allStudents, error } = await supabase
                .from('students')
                .select('level');
            if (error) throw error;

            const total = allStudents.length;
            const nd1 = allStudents.filter(s => s.level === 'ND I').length;
            const nd2 = allStudents.filter(s => s.level === 'ND II').length;
            const hnd1 = allStudents.filter(s => s.level === 'HND I').length;
            const hnd2 = allStudents.filter(s => s.level === 'HND II').length;

            cardsContainer.innerHTML = `
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-users"></i></div><div class="dash-number">${total}</div><div class="dash-label">Total Students</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-graduate"></i></div><div class="dash-number">${nd1}</div><div class="dash-label">ND I</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-graduate"></i></div><div class="dash-number">${nd2}</div><div class="dash-label">ND II</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-tie"></i></div><div class="dash-number">${hnd1}</div><div class="dash-label">HND I</div></div>
                <div class="dash-card"><div class="dash-icon"><i class="fas fa-user-tie"></i></div><div class="dash-number">${hnd2}</div><div class="dash-label">HND II</div></div>
            `;

            const { data: recent, error: rError } = await supabase
                .from('students')
                .select('full_name, uid, level, created_at')
                .order('created_at', { ascending: false })
                .limit(5);
            if (rError) throw rError;
            if (recent && recent.length) {
                recentContainer.innerHTML = recent.map(s =>
                    `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
                        <span><strong>${s.full_name}</strong> (${s.uid})</span>
                        <span style="color:var(--text-muted);">${s.level} • ${new Date(s.created_at).toLocaleDateString()}</span>
                    </div>`
                ).join('');
            } else {
                recentContainer.innerHTML = 'No students yet.';
            }
        } catch (err) {
            cardsContainer.innerHTML = '<div class="dash-card"><p>Error loading stats.</p></div>';
            console.error(err);
        }
    }

    // ---------- STUDENTS LIST ----------
    async function loadStudents(search = '', level = '') {
        const tbody = document.getElementById('students-tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">Loading...</td></tr>';

        try {
            let query = supabase.from('students').select('*');
            if (search) {
                query = query.or(`full_name.ilike.%${search}%,uid.ilike.%${search}%`);
            }
            if (level) {
                query = query.eq('level', level);
            }
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            if (!data || data.length === 0) {
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
                        <button onclick="deleteStudent('${s.id}')" class="danger"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#b91c1c;">Error loading students.</td></tr>';
            console.error(err);
        }
    }

    // Search/filter events
    document.getElementById('student-search')?.addEventListener('input', (e) => {
        const level = document.getElementById('student-level-filter').value;
        loadStudents(e.target.value, level);
    });
    document.getElementById('student-level-filter')?.addEventListener('change', (e) => {
        const search = document.getElementById('student-search').value;
        loadStudents(search, e.target.value);
    });
    document.getElementById('refresh-students')?.addEventListener('click', () => {
        const search = document.getElementById('student-search').value;
        const level = document.getElementById('student-level-filter').value;
        loadStudents(search, level);
    });

    // ---------- ADD STUDENT ----------
    const addForm = document.getElementById('add-student-form');
    const addResult = document.getElementById('add-student-result');
    const newUidDisplay = document.getElementById('new-uid-display');

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('add-student-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        addResult.style.display = 'none';

        const full_name = document.getElementById('add-fullname').value.trim();
        const matric_number = document.getElementById('add-matric').value.trim();
        const level = document.getElementById('add-level').value;
        const academic_session = document.getElementById('add-session').value.trim();

        try {
            const uid = await generateUID(level, supabase);

            const { data, error } = await supabase
                .from('students')
                .insert([{
                    uid,
                    full_name,
                    matric_number,
                    department: 'Computer Science',
                    level,
                    academic_session
                }])
                .select();
            if (error) throw error;

            newUidDisplay.textContent = uid;
            addResult.style.display = 'block';
            addForm.reset();
            document.getElementById('add-session').value = '2025/2026';
            if (document.getElementById('section-dashboard').style.display !== 'none') loadDashboard();
            if (document.getElementById('section-students').style.display !== 'none') loadStudents();

        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Generate UID & Save';
        }
    });

    // Copy UID
    document.getElementById('copy-uid-btn')?.addEventListener('click', () => {
        const text = newUidDisplay.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-uid-btn');
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i> Copy', 2000);
        }).catch(() => alert('Press Ctrl+C to copy'));
    });

    // ---------- DELETE STUDENT ----------
    window.deleteStudent = async function(id) {
        if (!confirm('Are you sure you want to delete this student and all their results?')) return;
        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
            loadStudents();
            loadDashboard();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    window.editStudent = function(id) {
        alert('Edit functionality: you can open a modal here for student ID: ' + id);
    };

    window.loadStudents = loadStudents;
    window.loadDashboard = loadDashboard;
});