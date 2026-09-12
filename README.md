# CS Department Result Portal

## To Setup Database

1. Create a Supabase project.
2. Execute `supabase/schema.sql` in the SQL editor.
3. (Optional) Execute `supabase/seed.sql` for sample data.
4. Update `js/supabase.js` with your Supabase URL and public anon key.
5. Create an admin user via Supabase Auth (email/password).
6. Open `index.html` in a browser.
7. To switch to real Supabase, edit `js/supabase.js` file and set USE_MOCK = false, then provide supabase credentials
## Features

- Student UID lookup with case-insensitive.
- Historical result navigation by year or academic session.
- Admin dashboard with student/result management.
- Automatic grade calculation and GPA.
- Print-friendly result pages.

## Security

- RLS policies restrict access; students can only see published results.
- Admin authentication via Supabase Auth.
- Service-role key never exposed.

## Demo Credentials

- Admin: admin@tgpa.edu / password (create via Supabase)"# result-demo" 
