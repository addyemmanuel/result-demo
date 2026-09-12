-- Students
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    matric_number TEXT,
    department TEXT NOT NULL DEFAULT 'Computer Science',
    level TEXT NOT NULL, -- e.g., 'ND I', 'ND II', 'HND I', 'HND II'
    academic_session TEXT, -- e.g., '2025/2026'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Result Sessions
CREATE TABLE result_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year INTEGER NOT NULL,
    academic_session TEXT NOT NULL,
    level TEXT NOT NULL,
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Published', 'Archived'
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Results (individual courses)
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_session_id UUID NOT NULL REFERENCES result_sessions(id) ON DELETE CASCADE,
    semester TEXT NOT NULL, -- 'First Semester', 'Second Semester'
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    credit_unit INTEGER NOT NULL,
    score INTEGER NOT NULL,
    grade TEXT NOT NULL,
    grade_point NUMERIC(3,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Policies
-- Students can read only their own data via UID lookup (we'll handle in app)
-- Admins have full access via authenticated role

CREATE POLICY "Students can read own record" ON students
    FOR SELECT USING (true); -- But we will filter by UID in app; RLS can be more strict but we rely on app logic

-- For admin access, we can use a role or simply allow authenticated users full access.
-- Since Supabase Auth doesn't have roles by default, we'll use a custom claim or just allow all authenticated to do everything.
-- In a real app, we'd add a role column and use that.

-- For simplicity, we'll allow authenticated users full CRUD, but we ensure only admin accounts are created.
CREATE POLICY "Admins can do everything" ON students
    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can do everything" ON result_sessions
    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can do everything" ON results
    FOR ALL USING (auth.role() = 'authenticated');

-- Note: In production, you'd want more granular policies.