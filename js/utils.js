// =============================================
// UTILS.JS – Helpers: Grade, GPA, UID
// =============================================

function calculateGrade(score) {
    if (score >= 70) return { grade: 'A', gradePoint: 4.0 };
    if (score >= 60) return { grade: 'B', gradePoint: 3.0 };
    if (score >= 50) return { grade: 'C', gradePoint: 2.0 };
    if (score >= 45) return { grade: 'D', gradePoint: 1.0 };
    if (score >= 40) return { grade: 'E', gradePoint: 0.0 };
    return { grade: 'F', gradePoint: 0.0 };
}

function calculateGPA(courses) {
    let totalUnits = 0, totalQuality = 0;
    courses.forEach(c => {
        totalUnits += c.credit_unit;
        totalQuality += c.credit_unit * c.grade_point;
    });
    if (totalUnits === 0) return 0;
    return totalQuality / totalUnits;
}

async function generateUID(level, supabaseClient) {
    const year = new Date().getFullYear();
    const prefix = `CSC-${level}-${year}`;
    // In mock, we rely on the mock's internal sequence
    // For real, we query the DB
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        // fallback
        return `${prefix}-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`;
    }
    try {
        const { data, error } = await supabaseClient
            .from('students')
            .select('uid')
            .ilike('uid', `${prefix}-%`)
            .order('uid', { ascending: false })
            .limit(1);
        if (error) throw error;
        let nextSeq = 1;
        if (data && data.length > 0) {
            const last = data[0].uid;
            const parts = last.split('-');
            const seq = parseInt(parts[3], 10);
            if (!isNaN(seq)) nextSeq = seq + 1;
        }
        return `${prefix}-${String(nextSeq).padStart(4, '0')}`;
    } catch (err) {
        console.warn('UID generation fallback', err);
        return `${prefix}-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}