// =============================================
// RESULTS.JS – Result Entry with Dynamic Courses
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const supabase = window.appSupabase;
    if (!supabase) {
        console.error('❌ appSupabase not available');
        return;
    }

    let selectedStudentId = null;
    const courseRowsContainer = document.getElementById('course-rows');

    // ---------- FIND STUDENT ----------
    document.getElementById('result-find-student')?.addEventListener('click', async () => {
        const uid = document.getElementById('result-student-uid').value.trim();
        if (!uid) return alert('Please enter a UID.');

        const { data, error } = await supabase
            .from('students')
            .select('id, full_name, uid, level')
            .ilike('uid', uid)
            .maybeSingle();

        if (error || !data) {
            document.getElementById('result-student-info').style.display = 'none';
            alert('Student not found.');
            return;
        }

        selectedStudentId = data.id;
        const infoDiv = document.getElementById('result-student-info');
        infoDiv.style.display = 'block';
        document.getElementById('result-student-name').textContent = data.full_name;
        document.getElementById('result-student-uid-display').textContent = data.uid;
        document.getElementById('result-student-level').textContent = data.level;
        document.getElementById('result-level').value = data.level;
    });

    // ---------- ADD COURSE ROW ----------
    function addCourseRow(courseCode = '', title = '', units = '', score = '') {
        const row = document.createElement('div');
        row.className = 'course-row';
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:10px;padding:10px;background:var(--bg-light);border-radius:var(--radius-sm);';

        row.innerHTML = `
            <div style="flex:1;min-width:100px;">
                <label style="font-size:0.75rem;font-weight:500;">Code</label>
                <input type="text" class="course-code" value="${courseCode}" placeholder="CSC301"
                    style="width:100%;padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;" />
            </div>
            <div style="flex:2;min-width:140px;">
                <label style="font-size:0.75rem;font-weight:500;">Title</label>
                <input type="text" class="course-title" value="${title}" placeholder="Data Structures"
                    style="width:100%;padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;" />
            </div>
            <div style="flex:0.5;min-width:60px;">
                <label style="font-size:0.75rem;font-weight:500;">Units</label>
                <input type="number" class="course-units" value="${units}" placeholder="3"
                    style="width:100%;padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;" />
            </div>
            <div style="flex:0.5;min-width:60px;">
                <label style="font-size:0.75rem;font-weight:500;">Score</label>
                <input type="number" class="course-score" value="${score}" placeholder="78"
                    style="width:100%;padding:6px 10px;border:1px solid var(--border-color);border-radius:6px;" />
            </div>
            <div style="flex:0.5;min-width:60px;">
                <label style="font-size:0.75rem;font-weight:500;">Grade</label>
                <input type="text" class="course-grade" readonly placeholder="A"
                    style="width:100%;padding:6px 10px;background:#f0f0f0;border:1px solid var(--border-color);border-radius:6px;" />
            </div>
            <div style="flex:0.5;min-width:60px;">
                <label style="font-size:0.75rem;font-weight:500;">GP</label>
                <input type="text" class="course-gp" readonly placeholder="4.0"
                    style="width:100%;padding:6px 10px;background:#f0f0f0;border:1px solid var(--border-color);border-radius:6px;" />
            </div>
            <button class="remove-course" type="button"
                style="background:#fee;border:none;border-radius:6px;padding:6px 10px;color:#b91c1c;cursor:pointer;font-size:0.8rem;margin-bottom:2px;">
                <i class="fas fa-times"></i>
            </button>
        `;

        const scoreInput = row.querySelector('.course-score');
        const gradeInput = row.querySelector('.course-grade');
        const gpInput = row.querySelector('.course-gp');

        scoreInput.addEventListener('input', function () {
            const score = parseFloat(this.value);
            if (!isNaN(score) && score >= 0 && score <= 100) {
                const result = calculateGrade(score);
                gradeInput.value = result.grade;
                gpInput.value = result.gradePoint.toFixed(1);
            } else {
                gradeInput.value = '';
                gpInput.value = '';
            }
        });

        row.querySelector('.remove-course').addEventListener('click', function () {
            row.remove();
        });

        courseRowsContainer.appendChild(row);

        if (score) scoreInput.dispatchEvent(new Event('input'));
    }

    // Initial row
    addCourseRow();

    // ---------- ADD COURSE BUTTON ----------
    document.getElementById('add-course-row')?.addEventListener('click', () => {
        addCourseRow();
    });

    // ---------- SAVE RESULT ----------
    document.getElementById('save-result-btn')?.addEventListener('click', async () => {
        const feedback = document.getElementById('result-feedback');
        feedback.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        feedback.style.color = 'var(--text-secondary)';

        if (!selectedStudentId) {
            feedback.innerHTML = '❌ Please load a student first.';
            feedback.style.color = '#b91c1c';
            return;
        }

        if (!window.currentAdminId) {
            feedback.innerHTML = '❌ Admin session not ready. Please refresh.';
            feedback.style.color = '#b91c1c';
            return;
        }

        // Gather course data
        const rows = document.querySelectorAll('.course-row');
        const courses = [];
        let valid = true;
        rows.forEach(row => {
            const code = row.querySelector('.course-code').value.trim();
            const title = row.querySelector('.course-title').value.trim();
            const units = parseInt(row.querySelector('.course-units').value);
            const score = parseFloat(row.querySelector('.course-score').value);
            const grade = row.querySelector('.course-grade').value;
            const gp = parseFloat(row.querySelector('.course-gp').value);

            if (!code || !title || !units || isNaN(score)) {
                valid = false;
                return;
            }
            courses.push({ code, title, units, score, grade, gradePoint: gp });
        });

        if (!valid || courses.length === 0) {
            feedback.innerHTML = '❌ Please fill in all course fields correctly.';
            feedback.style.color = '#b91c1c';
            return;
        }

        const year = parseInt(document.getElementById('result-year').value);
        const session = document.getElementById('result-session').value.trim();
        const level = document.getElementById('result-level').value;
        const semester = document.getElementById('result-semester').value;

        if (!session || !year || !level) {
            feedback.innerHTML = '❌ Please fill in academic year, session, and level.';
            feedback.style.color = '#b91c1c';
            return;
        }

        try {
            // 1. Create result session with status 'Pending'
            const { data: sessionData, error: sessionError } = await supabase
                .from('result_sessions')
                .insert([{
                    student_id: selectedStudentId,
                    academic_year: year,
                    academic_session: session,
                    level: level,
                    status: 'Pending',                      // Awaiting verification
                    entered_by: window.currentAdminId,      // Track who submitted
                    submitted_at: new Date().toISOString(),
                    published_at: null
                }])
                .select();

            if (sessionError) throw sessionError;
            const sessionId = sessionData[0].id;

            // 2. Insert courses
            const resultsToInsert = courses.map(c => ({
                result_session_id: sessionId,
                semester: semester,
                course_code: c.code,
                course_title: c.title,
                credit_unit: c.units,
                score: c.score,
                grade: c.grade,
                grade_point: c.gradePoint
            }));

            const { error: resultsError } = await supabase
                .from('results')
                .insert(resultsToInsert);
            if (resultsError) throw resultsError;

            // 3. Audit log (optional)
            try {
                await supabase.from('audit_log').insert([{
                    actor_id: window.currentAdminId,
                    action: 'create_session',
                    entity_type: 'result_session',
                    entity_id: sessionId,
                    details: { course_count: courses.length, session, semester, level }
                }]);
            } catch (e) {
                console.warn('Audit log failed:', e);
            }

            feedback.innerHTML = '✅ Results submitted for verification. They will be visible to students once approved.';
            feedback.style.color = '#16a34a';

            // Optional: clear form
            courseRowsContainer.innerHTML = '';
            addCourseRow();

        } catch (err) {
            console.error(err);
            feedback.innerHTML = '❌ Error: ' + err.message;
            feedback.style.color = '#b91c1c';
        }
    });

});