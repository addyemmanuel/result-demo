# CS Department Result Portal

## Setup Steps

### 1. Supabase
- Create a project
- Run `supabase/schema.sql` in the SQL Editor
- Create the super-admin auth user: Auth → Users → Add User
- Copy their UUID, then run the seed INSERT at the bottom of `schema.sql`
- Deploy the Edge Function:
  ```bash
  supabase functions deploy create-admin-user

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
