// =============================================
// SUPABASE.JS – Client Initialisation
// =============================================

const USE_MOCK = true; // Set to false to use real Supabase

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let client;

if (USE_MOCK) {
    if (typeof window.mockSupabase !== 'undefined') {
        client = window.mockSupabase;
        console.log('🔧 Using MOCK Supabase client');
    } else {
        console.error('❌ mockSupabase not defined! Ensure mock-supabase.js is loaded first.');
        client = {
            from: () => { throw new Error('Mock client not available'); },
            auth: { getSession: () => Promise.reject('Mock auth not available') }
        };
    }
} else {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('🔗 Using REAL Supabase client');
    } else {
        console.error('❌ Supabase library not loaded!');
        client = null;
    }
}

// Assign to global for all scripts to use
window.appSupabase = client;