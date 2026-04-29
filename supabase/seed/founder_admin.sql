-- Founder admin seed path.
-- Run only after the founder has a Supabase Auth user and profile row.
-- Replace the email before execution.

update public.profiles
set is_platform_admin = true,
    updated_at = now()
where email = 'founder@genilabs.ai';
