// =============================================
// STUDENT.JS – Index page: UID lookup & redirect
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🟢 student.js loaded');

    const supabase = window.appSupabase;
    if (!supabase) {
        console.error('❌ appSupabase is undefined');
        const errorEl = document.getElementById('uid-error');
        if (errorEl) errorEl.textContent = 'System unavailable. Please try again later.';
        return;
    }
    console.log('✅ appSupabase found');

    const form = document.getElementById('uid-form');
    const input = document.getElementById('uid-input');
    const errorEl = document.getElementById('uid-error');
    const button = document.getElementById('check-result-btn');

    if (!form || !input || !errorEl || !button) {
        console.error('❌ Required DOM elements missing');
        return;
    }

    async function handleCheck(e) {
        e.preventDefault();
        const uid = input.value.trim();
        console.log('🔍 Checking UID:', uid);
        errorEl.textContent = '';

        if (!uid) {
            errorEl.textContent = 'Please enter a valid UID.';
            return;
        }

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

        try {
            // Try case‑insensitive ilike first
            let { data: student, error } = await supabase
                .from('students')
                .select('uid')
                .ilike('uid', uid)
                .maybeSingle();

            // Fallback: if not found, try exact match (case‑sensitive)
            if (!student && !error) {
                console.warn('⚠️ ilike returned null, trying eq fallback');
                const result = await supabase
                    .from('students')
                    .select('uid')
                    .eq('uid', uid)
                    .maybeSingle();
                student = result.data;
                error = result.error;
            }

            console.log('Student query result:', student, error);

            if (error || !student) {
                errorEl.textContent = 'No student was found with this UID.';
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-search"></i> Check Result';
                return;
            }

            const redirectUrl = `result.html?uid=${encodeURIComponent(student.uid)}`;
            console.log('✅ Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;

        } catch (err) {
            console.error('❌ Error during lookup:', err);
            errorEl.textContent = 'Unable to verify UID. Please try again.';
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-search"></i> Check Result';
        }
    }

    form.addEventListener('submit', handleCheck);
    button.addEventListener('click', handleCheck);

    console.log('✅ Event listeners attached');
});