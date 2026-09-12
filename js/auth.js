// =============================================
// AUTH.JS – Authentication Logic (Admin)
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const supabase = window.appSupabase;
    if (!supabase) {
        console.error('❌ Auth: appSupabase not available');
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = 'System unavailable. Please try again later.';
            errorEl.style.display = 'block';
        }
        return;
    }

    // ---------- Login ----------
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            errorEl.style.display = 'none';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    errorEl.textContent = error.message;
                    errorEl.style.display = 'block';
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                    return;
                }
                // Redirect to admin dashboard
                window.location.href = 'admin.html';
            } catch (err) {
                errorEl.textContent = err.message || 'Login failed';
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        });
    }

    // ---------- Session check for admin pages ----------
    if (window.location.pathname.includes('admin.html')) {
        if (supabase.auth && supabase.auth.getSession) {
            supabase.auth.getSession().then(({ data }) => {
                if (!data.session) {
                    window.location.href = 'admin-login.html';
                }
            }).catch(() => {
                // In mock mode, we can ignore or redirect
                if (USE_MOCK) {
                    console.log('🔧 Mock mode: session check skipped');
                } else {
                    window.location.href = 'admin-login.html';
                }
            });
        } else {
            console.warn('⚠️ auth.getSession not available');
        }
    }

    // ---------- Logout ----------
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabase.auth && supabase.auth.signOut) {
                await supabase.auth.signOut();
            }
            window.location.href = 'index.html';
        });
    }
});