// =============================================
// RESULT-DISPLAY.JS – Loads result from URL param
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.appSupabase;
    if (!supabase) {
        document.getElementById('result-container').innerHTML = 
            '<div class="error-message">System unavailable.</div>';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    if (!uid) {
        document.getElementById('result-container').innerHTML = 
            '<div class="error-message">No UID provided.</div>';
        return;
    }

    console.log('🔍 Looking up UID:', uid);
    const container = document.getElementById('result-container');
    container.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading result...</p>';

    try {
        // 1. Find student
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .ilike('uid', uid)
            .maybeSingle();

        if (studentError || !student) {
            console.error('Student not found:', studentError);
            container.innerHTML = '<div class="error-message">No student found with this UID.</div>';
            return;
        }
        console.log('✅ Student found:', student);

        // 2. Get all published sessions
        const { data: sessions, error: sessionsError } = await supabase
            .from('result_sessions')
            .select('*')
            .eq('student_id', student.id)
            .eq('status', 'Published')
            .order('academic_year', { ascending: false });

        if (sessionsError) {
            console.error('Session error:', sessionsError);
        }
        console.log('📚 Sessions found:', sessions);

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<p>No published results available for this student.</p>';
            return;
        }

        // 3. Render result with history
        renderResult(student, sessions, container);

        // 4. Print button
        document.getElementById('print-result-btn')?.addEventListener('click', () => {
            window.print();
        });

    } catch (err) {
        console.error('❌ Error:', err);
        container.innerHTML = '<div class="error-message">Unable to retrieve result. Please try again.</div>';
    }
});

// ---------- Render Function (same as before) ----------
function renderResult(student, sessions, container) {
    // ... (same render logic as previous answer)
    // Make sure to use supabase from window.appSupabase inside renderSession
    const supabase = window.appSupabase;

    let html = `
        <div class="result-card">
            <div class="student-info">
                <div class="name">${student.full_name}</div>
                <div class="detail"><strong>UID:</strong> ${student.uid}</div>
                <div class="detail"><strong>Department:</strong> ${student.department}</div>
                <div class="detail"><strong>Level:</strong> ${student.level}</div>
                <div class="detail"><strong>Session:</strong> ${student.academic_session}</div>
            </div>
            <div class="result-history">
                <div class="history-toggle">
                    <span style="font-weight:500;">Result History:</span>
                    <button class="toggle-btn active" data-mode="year">Year</button>
                    <button class="toggle-btn" data-mode="session">Session</button>
                </div>
                <div class="history-chips" id="history-chips"></div>
            </div>
            <div id="session-display"></div>
        </div>
    `;
    container.innerHTML = html;

    const chipsContainer = document.getElementById('history-chips');
    let currentMode = 'year';
    let selectedSessionId = sessions[0].id;

    function renderChips(mode) {
        chipsContainer.innerHTML = '';
        let groups = {};
        if (mode === 'year') {
            sessions.forEach(s => {
                const year = s.academic_year;
                if (!groups[year]) groups[year] = [];
                groups[year].push(s);
            });
            Object.keys(groups).sort((a,b) => b - a).forEach(year => {
                const chip = document.createElement('div');
                chip.className = 'history-chip';
                chip.dataset.year = year;
                chip.textContent = year;
                const hasSelected = groups[year].some(s => s.id === selectedSessionId);
                if (hasSelected) chip.classList.add('active');
                chip.addEventListener('click', () => {
                    const latest = groups[year].reduce((a,b) => a.academic_year > b.academic_year ? a : b);
                    selectSession(latest.id);
                });
                chipsContainer.appendChild(chip);
            });
        } else {
            sessions.forEach(s => {
                const chip = document.createElement('div');
                chip.className = 'history-chip';
                chip.dataset.session = s.academic_session;
                chip.textContent = s.academic_session;
                if (s.id === selectedSessionId) chip.classList.add('active');
                chip.addEventListener('click', () => selectSession(s.id));
                chipsContainer.appendChild(chip);
            });
        }
    }

    function selectSession(sessionId) {
        selectedSessionId = sessionId;
        renderChips(currentMode);
        renderSession(sessionId);
    }

    function renderSession(sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const display = document.getElementById('session-display');
        display.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> Loading results...</p>`;

        supabase
            .from('results')
            .select('*')
            .eq('result_session_id', sessionId)
            .order('semester', { ascending: true })
            .then(({ data: courses, error }) => {
                if (error || !courses || courses.length === 0) {
                    display.innerHTML = `<p>No courses found for this session.</p>`;
                    return;
                }
                // Group by semester
                const semesters = {};
                courses.forEach(c => {
                    if (!semesters[c.semester]) semesters[c.semester] = [];
                    semesters[c.semester].push(c);
                });
                let html = `<div class="session-header">
                    <h3>${session.academic_session} — ${session.level}</h3>
                    <p><small>Published: ${formatDate(session.published_at)}</small></p>
                </div>`;
                const semesterOrder = ['First Semester', 'Second Semester'];
                semesterOrder.forEach(sem => {
                    if (semesters[sem]) {
                        html += `<div class="semester-block">
                            <div class="semester-title">${sem}</div>
                            <div class="result-table-wrap">
                                <table class="result-table">
                                    <thead><tr>
                                        <th>Course Code</th>
                                        <th>Course Title</th>
                                        <th>Units</th>
                                        <th>Score</th>
                                        <th>Grade</th>
                                        <th>GP</th>
                                    </tr></thead>
                                    <tbody>`;
                        let totalUnits = 0, totalQuality = 0;
                        semesters[sem].forEach(c => {
                            totalUnits += c.credit_unit;
                            totalQuality += c.credit_unit * c.grade_point;
                            html += `<tr>
                                <td>${c.course_code}</td>
                                <td>${c.course_title}</td>
                                <td>${c.credit_unit}</td>
                                <td>${c.score}</td>
                                <td>${c.grade}</td>
                                <td>${c.grade_point.toFixed(1)}</td>
                            </tr>`;
                        });
                        const gpa = totalUnits ? (totalQuality/totalUnits) : 0;
                        html += `</tbody></table>
                            </div>
                            <div style="margin-top:8px; font-weight:500;">
                                GPA: ${gpa.toFixed(2)} &nbsp;|&nbsp; Total Units: ${totalUnits}
                            </div>
                        </div>`;
                    }
                });
                // Overall GPA for session
                let allUnits = 0, allQuality = 0;
                courses.forEach(c => {
                    allUnits += c.credit_unit;
                    allQuality += c.credit_unit * c.grade_point;
                });
                const cgpa = allUnits ? (allQuality/allUnits) : 0;
                html += `<div class="gpa-summary">
                    <div class="gpa-item"><strong>Session GPA:</strong> ${cgpa.toFixed(2)}</div>
                    <div class="gpa-item"><strong>Total Credits:</strong> ${allUnits}</div>
                </div>`;
                display.innerHTML = html;
            });
    }

    // Toggle between year and session
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            renderChips(currentMode);
            selectSession(selectedSessionId);
        });
    });

    renderChips('year');
    selectSession(selectedSessionId);
}