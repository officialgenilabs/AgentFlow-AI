# AgentFlow AI

Premium multi-tenant real-estate lead conversion operating system for Gen I Labs.

## Stage A + Early Stage E

Built in this foundation:

- Next.js App Router + TypeScript + Tailwind CSS
- shadcn/ui-style component primitives
- Supabase Auth client/server integration
- Tenant-aware route protection
- Founder admin shell: `/admin/dashboard`
- Client dashboard shell: `/app/:orgSlug/dashboard`
- Branding MVP: `/app/:orgSlug/branding`
- Stage A Supabase migration with RLS and tenant isolation

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Required Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase migration

Apply `supabase/migrations/20260429_stage_a_multi_tenant_core.sql` to the AgentFlow AI Supabase project.

Founder seed path after creating the founder auth user:

```sql
update public.profiles
set is_platform_admin = true
where email = 'FOUNDER_EMAIL_HERE';
```

Use `supabase/seed/founder_admin.sql` as the auditable seed template.

## Tenant isolation doctrine

Every tenant-owned table includes `organization_id`. Client routes resolve organizations by verified authenticated membership or platform-admin status. Client-supplied `organization_id` is not trusted.
