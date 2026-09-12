// =============================================
// MOCK-SUPABASE.JS – Full Seed Data (20 Students)
// =============================================

// ---------- Helper: random score and grade ----------
function randomScore(min = 40, max = 95) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomGrade(score) {
    if (score >= 70) return { grade: 'A', gradePoint: 4.0 };
    if (score >= 60) return { grade: 'B', gradePoint: 3.0 };
    if (score >= 50) return { grade: 'C', gradePoint: 2.0 };
    if (score >= 45) return { grade: 'D', gradePoint: 1.0 };
    if (score >= 40) return { grade: 'E', gradePoint: 0.0 };
    return { grade: 'F', gradePoint: 0.0 };
}

// ---------- Course templates by level ----------
const courseTemplates = {
    'ND I': [
        { code: 'CSC101', title: 'Introduction to Computing', units: 3 },
        { code: 'CSC103', title: 'Programming Fundamentals', units: 3 },
        { code: 'MTH101', title: 'Mathematics I', units: 2 },
        { code: 'GST101', title: 'English Communication', units: 2 },
        { code: 'PHY101', title: 'Physics I', units: 2 },
    ],
    'ND II': [
        { code: 'CSC201', title: 'Data Structures', units: 3 },
        { code: 'CSC203', title: 'Web Development', units: 2 },
        { code: 'CSC205', title: 'Database Systems', units: 3 },
        { code: 'MTH201', title: 'Mathematics II', units: 2 },
        { code: 'GST201', title: 'Introduction to Philosophy', units: 2 },
    ],
    'HND I': [
        { code: 'CSC301', title: 'Advanced Programming', units: 3 },
        { code: 'CSC303', title: 'Computer Networks', units: 3 },
        { code: 'CSC305', title: 'Software Engineering', units: 3 },
        { code: 'MTH301', title: 'Statistics', units: 2 },
        { code: 'GST301', title: 'Research Methods', units: 2 },
    ],
    'HND II': [
        { code: 'CSC401', title: 'Project Management', units: 3 },
        { code: 'CSC403', title: 'Artificial Intelligence', units: 3 },
        { code: 'CSC405', title: 'Cybersecurity', units: 3 },
        { code: 'CSC407', title: 'Mobile App Development', units: 2 },
        { code: 'GST401', title: 'Entrepreneurship', units: 2 },
    ]
};

// ---------- Generate 20 Students ----------
const studentNames = [
    'Adeola Johnson', 'Bola Adebayo', 'Chidi Okonkwo', 'John Emmanuel', 'Fatima Bello',
    'Grace Okafor', 'Samuel Adeyemi', 'Tunde Bakare', 'Ngozi Eze', 'Oluwafemi Adeleke',
    'Zainab Mohammed', 'Chinonso Obi', 'Emeka Nwosu', 'Folake Adekunle', 'Ibrahim Musa',
    'Kemi Ogunleye', 'Lagos Adebayo', 'Mfonobong Inyang', 'Nneka Okonkwo', 'Peter Okafor'
];

const levels = ['ND I', 'ND II', 'HND I', 'HND II'];
const sessions = ['2023/2024', '2024/2025', '2025/2026'];

function generateUID(level, year, sequence) {
    return `CSC-${level}-${year}-${String(sequence).padStart(4, '0')}`;
}

const students = [];
const resultSessions = [];
const results = [];

let seqCounter = 1;
let sessionCounter = 1;

studentNames.forEach((name, idx) => {
    const level = levels[idx % levels.length];
    const year = 2026 - Math.floor(idx / 4);
    const uid = generateUID(level, year, seqCounter++);
    const matric = `M${year}/${String(seqCounter).padStart(3, '0')}`;
    const session = sessions[idx % sessions.length];

    const student = {
        id: `stu-${idx + 1}`,
        uid,
        full_name: name,
        matric_number: matric,
        department: 'Computer Science',
        level,
        academic_session: session,
        created_at: new Date(Date.now() - idx * 86400000 * 30).toISOString()
    };
    students.push(student);

    // Create 1 or 2 result sessions
    const numSessions = 1 + (idx % 2);
    for (let s = 0; s < numSessions; s++) {
        const yearOffset = numSessions - 1 - s;
        const sessionYear = 2026 - yearOffset;
        const sessionLabel = `${sessionYear - 1}/${sessionYear}`;
        const sessionLevel = level;

        const rs = {
            id: `rs-${sessionCounter++}`,
            student_id: student.id,
            academic_year: sessionYear,
            academic_session: sessionLabel,
            level: sessionLevel,
            status: 'Published',
            published_at: new Date(Date.now() - yearOffset * 86400000 * 365).toISOString(),
            created_at: new Date(Date.now() - yearOffset * 86400000 * 365 - 86400000 * 30).toISOString(),
            updated_at: new Date(Date.now() - yearOffset * 86400000 * 365).toISOString()
        };
        resultSessions.push(rs);

        // Add courses for both semesters
        const courses = courseTemplates[sessionLevel] || courseTemplates['ND I'];
        const semesters = ['First Semester', 'Second Semester'];
        semesters.forEach((sem) => {
            courses.forEach(course => {
                const score = randomScore(45, 92);
                const gradeInfo = randomGrade(score);
                results.push({
                    id: `res-${results.length + 1}`,
                    result_session_id: rs.id,
                    semester: sem,
                    course_code: course.code,
                    course_title: course.title,
                    credit_unit: course.units,
                    score: score,
                    grade: gradeInfo.grade,
                    grade_point: gradeInfo.gradePoint,
                    created_at: new Date(Date.now() - yearOffset * 86400000 * 365).toISOString()
                });
            });
        });
    }
});

// ---------- In-Memory Store ----------
let currentStudents = [...students];
let currentResultSessions = [...resultSessions];
let currentResults = [...results];

// ---------- Helper: Generate UID (mock) ----------
function generateMockUID(level) {
    const year = new Date().getFullYear();
    const prefix = `CSC-${level}-${year}`;
    const existing = currentStudents.filter(s => s.uid.startsWith(prefix));
    const nextSeq = existing.length + 1;
    return `${prefix}-${String(nextSeq).padStart(4, '0')}`;
}

// ---------- Mock Supabase Client (with debug) ----------
const mockSupabase = {
    from: (table) => {
        let data = [];
        if (table === 'students') data = currentStudents;
        else if (table === 'result_sessions') data = currentResultSessions;
        else if (table === 'results') data = currentResults;
        else throw new Error(`Table ${table} not mocked`);

        let filters = [];
        let orderField = null;
        let orderAsc = true;
        let limitVal = null;

        const api = {
            select: (fields) => api,
            insert: (records) => {
                const recordsArray = Array.isArray(records) ? records : [records];
                const inserted = recordsArray.map(rec => {
                    const newRec = {
                        id: Math.random().toString(36).substr(2, 9),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        ...rec
                    };
                    data.push(newRec);
                    return newRec;
                });
                return Promise.resolve({ data: inserted, error: null });
            },
            delete: () => ({
                eq: (field, value) => {
                    const index = data.findIndex(item => item[field] === value);
                    if (index !== -1) data.splice(index, 1);
                    return Promise.resolve({ data: [], error: null });
                }
            }),
            update: (updates) => ({
                eq: (field, value) => {
                    const item = data.find(item => item[field] === value);
                    if (item) {
                        Object.assign(item, updates, { updated_at: new Date().toISOString() });
                    }
                    return Promise.resolve({ data: item ? [item] : [], error: null });
                }
            }),
            eq: (field, value) => {
                filters.push({ field, value, operator: 'eq' });
                return api;
            },
            ilike: (field, pattern) => {
                // Remove % wildcards and convert to lowercase for case‑insensitive match
                const search = pattern.replace(/%/g, '').toLowerCase();
                filters.push({ field, value: search, operator: 'ilike' });
                return api;
            },
            or: (conditions) => {
                const parts = conditions.split(',');
                filters.push({ operator: 'or', parts });
                return api;
            },
            order: (field, options) => {
                orderField = field;
                orderAsc = options?.ascending !== false;
                return api;
            },
            limit: (n) => {
                limitVal = n;
                return api;
            },
            maybeSingle: () => {
                let filtered = [...data];
                filters.forEach(f => {
                    if (f.operator === 'eq') {
                        filtered = filtered.filter(item => item[f.field] === f.value);
                    } else if (f.operator === 'ilike') {
                        const lowerVal = f.value.toLowerCase();
                        filtered = filtered.filter(item => 
                            String(item[f.field]).toLowerCase().includes(lowerVal)
                        );
                    } else if (f.operator === 'or') {
                        filtered = filtered.filter(item => {
                            return f.parts.some(part => {
                                const [field, op, val] = part.split('.');
                                if (op === 'ilike') {
                                    const search = val.replace(/%/g, '').toLowerCase();
                                    return String(item[field]).toLowerCase().includes(search);
                                }
                                return false;
                            });
                        });
                    }
                });
                if (orderField) {
                    filtered.sort((a, b) => {
                        const va = a[orderField];
                        const vb = b[orderField];
                        if (va < vb) return orderAsc ? -1 : 1;
                        if (va > vb) return orderAsc ? 1 : -1;
                        return 0;
                    });
                }
                if (limitVal) filtered = filtered.slice(0, limitVal);
                const result = filtered.length ? filtered[0] : null;
                return Promise.resolve({ data: result, error: null });
            },
            then: (resolve, reject) => {
                // Same as maybeSingle but returns array
                let filtered = [...data];
                filters.forEach(f => {
                    if (f.operator === 'eq') {
                        filtered = filtered.filter(item => item[f.field] === f.value);
                    } else if (f.operator === 'ilike') {
                        const lowerVal = f.value.toLowerCase();
                        filtered = filtered.filter(item => 
                            String(item[f.field]).toLowerCase().includes(lowerVal)
                        );
                    } else if (f.operator === 'or') {
                        filtered = filtered.filter(item => {
                            return f.parts.some(part => {
                                const [field, op, val] = part.split('.');
                                if (op === 'ilike') {
                                    const search = val.replace(/%/g, '').toLowerCase();
                                    return String(item[field]).toLowerCase().includes(search);
                                }
                                return false;
                            });
                        });
                    }
                });
                if (orderField) {
                    filtered.sort((a, b) => {
                        const va = a[orderField];
                        const vb = b[orderField];
                        if (va < vb) return orderAsc ? -1 : 1;
                        if (va > vb) return orderAsc ? 1 : -1;
                        return 0;
                    });
                }
                if (limitVal) filtered = filtered.slice(0, limitVal);
                resolve({ data: filtered, error: null });
            }
        };
        return api;
    },
    auth: {
        signInWithPassword: ({ email, password }) => {
            if (email === 'admin@tgpa.edu') {
                return Promise.resolve({ data: { user: { email }, session: { access_token: 'mock-token' } }, error: null });
            } else {
                return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
            }
        },
        signOut: () => Promise.resolve({ error: null }),
        getSession: () => Promise.resolve({ data: { session: { access_token: 'mock-token' } }, error: null })
    }
};

// Debug: log the students to verify they exist
console.log('✅ MOCK: Students loaded:', students.map(s => s.uid));

// Expose to global
window.mockSupabase = mockSupabase;