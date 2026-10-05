// =============================================
// SUPABASE.JS – Reads config, initialises client
// =============================================

(function () {
    const cfg = window.__APP_CONFIG;
    if (!cfg) {
        console.error('❌ config.js is missing. Copy config.example.js → config.js');
        window.appSupabase = null;
        return;
    }

    if (cfg.USE_MOCK) {
        if (typeof window.mockSupabase !== 'undefined') {
            window.appSupabase = window.mockSupabase;
            console.log('🔧 Using MOCK Supabase client');
        } else {
            console.error('❌ mockSupabase not defined.');
            window.appSupabase = null;
        }
        return;
    }

    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.error('❌ Supabase library not loaded. Add the CDN script tag.');
        window.appSupabase = null;
        return;
    }

    window.appSupabase = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
    console.log('🔗 Real Supabase client ready');
})();