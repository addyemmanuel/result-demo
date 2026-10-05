// =============================================
// AUTH.JS – Login, session, and role detection
// =============================================

window.currentAdmin = null; // { id, email, full_name, role }

document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.appSupabase;
    if (!supabase) {
        console.error('❌ appSupabase not initialised');
        return;
    }

    // ---------- LOGIN ----------
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            errorEl.style.display = 'none';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                // Fetch role from admin_users
                const { data: adminRow, error: roleErr } = await supabase
                    .from('admin_users')
                    .select('role, is_active, full_name')
                    .eq('id', data.user.id)
                    .single();

                if (roleErr || !adminRow || !adminRow.is_active) {
                    await supabase.auth.signOut();
                    throw new Error('Your account is not authorised or is inactive.');
                }

                window.location.href = 'admin.html';
            } catch (err) {
                errorEl.textContent = err.message || 'Login failed';
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        });
    }

    // ---------- SESSION GUARD (admin.html) ----------
    if (window.location.pathname.includes('admin.html')) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'admin-login.html';
            return;
        }

        // Fetch role
        const { data: adminRow, error: roleErr } = await supabase
            .from('admin_users')
            .select('role, is_active, full_name, email')
            .eq('id', session.user.id)
            .single();

        if (roleErr || !adminRow || !adminRow.is_active) {
            await supabase.auth.signOut();
            window.location.href = 'admin-login.html';
            return;
        }

        // Publish globally for admin.js to consume
        window.currentAdmin = {
            id: session.user.id,
            email: adminRow.email,
            full_name: adminRow.full_name,
            role: adminRow.role
        };
        console.log('👤 Role:', adminRow.role);

        // Dispatch event so admin.js can react
        window.dispatchEvent(new CustomEvent('adminReady', { detail: window.currentAdmin }));
    }

    // ---------- LOGOUT ----------
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });
});