-- ============================================
-- CS RESULT PORTAL – SCHEMA v2 (Roles + Audit)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- students ----------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    matric_number TEXT,
    department TEXT NOT NULL DEFAULT 'Computer Science',
    level TEXT NOT NULL CHECK (level IN ('ND I', 'ND II', 'HND I', 'HND II')),
    academic_session TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_students_uid ON students (LOWER(uid));
CREATE INDEX IF NOT EXISTS idx_students_level ON students (level);

-- ---------- admin_users (role mapping) ----------
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'lecturer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- result_sessions ----------
CREATE TABLE IF NOT EXISTS result_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year INTEGER NOT NULL,
    academic_session TEXT NOT NULL,
    level TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Pending', 'Published', 'Archived')),
    entered_by UUID REFERENCES auth.users(id),          -- lecturer who created it
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    published_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (student_id, academic_year, academic_session, level)
);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON result_sessions (status);
CREATE INDEX IF NOT EXISTS idx_sessions_entered_by ON result_sessions (entered_by);

-- ---------- results ----------
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_session_id UUID NOT NULL REFERENCES result_sessions(id) ON DELETE CASCADE,
    semester TEXT NOT NULL CHECK (semester IN ('First Semester', 'Second Semester')),
    course_code TEXT NOT NULL,
    course_title TEXT NOT NULL,
    credit_unit INTEGER NOT NULL CHECK (credit_unit > 0),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    grade TEXT NOT NULL,
    grade_point NUMERIC(3,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_results_session ON results (result_session_id);

-- ---------- audit_log ----------
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);

-- ---------- auto updated_at ----------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS sessions_updated_at ON result_sessions;
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON result_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS results_updated_at ON results;
CREATE TRIGGER results_updated_at BEFORE UPDATE ON results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS (used inside RLS)
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
          AND role = 'super_admin'
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = auth.uid()
          AND is_active = TRUE
    );
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;

-- ============ admin_users ============
DROP POLICY IF EXISTS "read_own_admin_row" ON admin_users;
CREATE POLICY "read_own_admin_row" ON admin_users
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "super_admin_manage_admins" ON admin_users;
CREATE POLICY "super_admin_manage_admins" ON admin_users
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- ============ students ============
-- Public (anon) can look up students (needed for UID lookup).
-- ⚠️ Production: replace with an RPC that returns only one row by UID.
DROP POLICY IF EXISTS "public_read_students" ON students;
CREATE POLICY "public_read_students" ON students
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "active_admin_write_students" ON students;
CREATE POLICY "active_admin_write_students" ON students
    FOR INSERT TO authenticated WITH CHECK (is_active_admin());

DROP POLICY IF EXISTS "super_admin_update_students" ON students;
CREATE POLICY "super_admin_update_students" ON students
    FOR UPDATE TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "super_admin_delete_students" ON students;
CREATE POLICY "super_admin_delete_students" ON students
    FOR DELETE TO authenticated USING (is_super_admin());

-- ============ result_sessions ============
-- Anon sees only Published
DROP POLICY IF EXISTS "public_read_published_sessions" ON result_sessions;
CREATE POLICY "public_read_published_sessions" ON result_sessions
    FOR SELECT TO anon
    USING (status = 'Published');

-- Any active admin can read all sessions
DROP POLICY IF EXISTS "admin_read_all_sessions" ON result_sessions;
CREATE POLICY "admin_read_all_sessions" ON result_sessions
    FOR SELECT TO authenticated
    USING (is_active_admin());

-- Lecturers can INSERT new sessions (must be Draft/Pending, entered_by = self)
DROP POLICY IF EXISTS "lecturer_insert_session" ON result_sessions;
CREATE POLICY "lecturer_insert_session" ON result_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        is_active_admin()
        AND entered_by = auth.uid()
        AND status IN ('Draft', 'Pending')
    );

-- Lecturers can UPDATE only their own Draft/Pending sessions
DROP POLICY IF EXISTS "lecturer_update_own_draft" ON result_sessions;
CREATE POLICY "lecturer_update_own_draft" ON result_sessions
    FOR UPDATE TO authenticated
    USING (
        is_active_admin()
        AND entered_by = auth.uid()
        AND status IN ('Draft', 'Pending')
    )
    WITH CHECK (
        entered_by = auth.uid()
        AND status IN ('Draft', 'Pending')
    );

-- Super admin has full control over any session (publish, archive, edit)
DROP POLICY IF EXISTS "super_admin_all_sessions" ON result_sessions;
CREATE POLICY "super_admin_all_sessions" ON result_sessions
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- ============ results ============
-- Anon reads courses only from Published sessions
DROP POLICY IF EXISTS "public_read_published_results" ON results;
CREATE POLICY "public_read_published_results" ON results
    FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM result_sessions rs
        WHERE rs.id = results.result_session_id
          AND rs.status = 'Published'
    ));

-- Admins read all
DROP POLICY IF EXISTS "admin_read_all_results" ON results;
CREATE POLICY "admin_read_all_results" ON results
    FOR SELECT TO authenticated USING (is_active_admin());

-- Lecturers can insert courses if they own the parent session and it's Draft/Pending
DROP POLICY IF EXISTS "lecturer_insert_results" ON results;
CREATE POLICY "lecturer_insert_results" ON results
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM result_sessions rs
        WHERE rs.id = results.result_session_id
          AND rs.entered_by = auth.uid()
          AND rs.status IN ('Draft', 'Pending')
    ));

DROP POLICY IF EXISTS "lecturer_update_own_results" ON results;
CREATE POLICY "lecturer_update_own_results" ON results
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM result_sessions rs
        WHERE rs.id = results.result_session_id
          AND rs.entered_by = auth.uid()
          AND rs.status IN ('Draft', 'Pending')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM result_sessions rs
        WHERE rs.id = results.result_session_id
          AND rs.entered_by = auth.uid()
          AND rs.status IN ('Draft', 'Pending')
    ));

DROP POLICY IF EXISTS "lecturer_delete_own_results" ON results;
CREATE POLICY "lecturer_delete_own_results" ON results
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM result_sessions rs
        WHERE rs.id = results.result_session_id
          AND rs.entered_by = auth.uid()
          AND rs.status IN ('Draft', 'Pending')
    ));

-- Super admin full access
DROP POLICY IF EXISTS "super_admin_all_results" ON results;
CREATE POLICY "super_admin_all_results" ON results
    FOR ALL TO authenticated
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- ============ audit_log ============
DROP POLICY IF EXISTS "admin_read_audit" ON audit_log;
CREATE POLICY "admin_read_audit" ON audit_log
    FOR SELECT TO authenticated USING (is_active_admin());

DROP POLICY IF EXISTS "admin_insert_audit" ON audit_log;
CREATE POLICY "admin_insert_audit" ON audit_log
    FOR INSERT TO authenticated WITH CHECK (is_active_admin());

-- ============================================
-- SEED THE SUPER ADMIN (run once, after creating the auth user)
-- ============================================
-- 1. Create the user in Auth → Users → Add user (email + password)
-- 2. Copy their UUID and run:
--
-- INSERT INTO admin_users (id, email, full_name, role)
-- VALUES (
--     'PASTE-UUID-HERE',
--     'admin@university.edu',
--     'System Administrator',
--     'super_admin'
-- );