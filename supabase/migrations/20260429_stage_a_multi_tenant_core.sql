-- AgentFlow AI Stage A + Early Stage E
-- Auth + multi-tenant core, founder admin seed support, branding MVP.
-- Additive / rollback-safe: creates missing objects and enables tenant-safe RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing Stage 29/30 schemas may already have profiles. Expand in place; do not drop.
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists is_platform_admin boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  status text not null default 'setup',
  industry text not null default 'real_estate',
  plan text not null default 'starter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing backend schema has organizations without slug/status/plan. Expand safely.
alter table public.organizations add column if not exists slug text;
alter table public.organizations add column if not exists status text not null default 'setup';
alter table public.organizations add column if not exists industry text not null default 'real_estate';
alter table public.organizations add column if not exists plan text not null default 'starter';
alter table public.organizations add column if not exists created_at timestamptz not null default now();
alter table public.organizations add column if not exists updated_at timestamptz not null default now();

update public.organizations
set slug = lower(regexp_replace(coalesce(nullif(slug, ''), nullif(name, ''), id::text), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
where slug is null or slug = '';

alter table public.organizations alter column slug set not null;
create unique index if not exists organizations_slug_unique_idx on public.organizations(slug);

alter table public.organizations drop constraint if exists organizations_status_check;
alter table public.organizations add constraint organizations_status_check check (status in ('setup', 'active', 'paused', 'cancelled'));


create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.organization_branding (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_url text,
  primary_color text not null default '#111827',
  secondary_color text not null default '#f8fafc',
  accent_color text not null default '#c8a96a',
  theme_mode text not null default 'light' check (theme_mode in ('light', 'dark', 'system')),
  updated_at timestamptz not null default now(),
  check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  check (accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists organization_members_org_id_idx on public.organization_members(organization_id);
create index if not exists audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();

drop trigger if exists touch_organizations_updated_at on public.organizations;
create trigger touch_organizations_updated_at before update on public.organizations for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_platform_admin = true
  );
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$;

create or replace function public.can_manage_org(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select public.is_platform_admin() or exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin')
  );
$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_branding enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_self_or_platform_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_platform_admin" ON public.profiles
FOR SELECT USING (id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND is_platform_admin = false);

-- Organizations
DROP POLICY IF EXISTS "organizations_select_members_or_platform_admin" ON public.organizations;
CREATE POLICY "organizations_select_members_or_platform_admin" ON public.organizations
FOR SELECT USING (public.is_platform_admin() OR public.is_org_member(id));

DROP POLICY IF EXISTS "organizations_platform_admin_write" ON public.organizations;
CREATE POLICY "organizations_platform_admin_write" ON public.organizations
FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Organization members
DROP POLICY IF EXISTS "organization_members_select_self_org_or_platform_admin" ON public.organization_members;
CREATE POLICY "organization_members_select_self_org_or_platform_admin" ON public.organization_members
FOR SELECT USING (public.is_platform_admin() OR user_id = auth.uid() OR public.is_org_member(organization_id));

DROP POLICY IF EXISTS "organization_members_platform_admin_write" ON public.organization_members;
CREATE POLICY "organization_members_platform_admin_write" ON public.organization_members
FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Branding
DROP POLICY IF EXISTS "organization_branding_select_members_or_platform_admin" ON public.organization_branding;
CREATE POLICY "organization_branding_select_members_or_platform_admin" ON public.organization_branding
FOR SELECT USING (public.is_platform_admin() OR public.is_org_member(organization_id));

DROP POLICY IF EXISTS "organization_branding_admin_write" ON public.organization_branding;
CREATE POLICY "organization_branding_admin_write" ON public.organization_branding
FOR INSERT WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS "organization_branding_admin_update" ON public.organization_branding;
CREATE POLICY "organization_branding_admin_update" ON public.organization_branding
FOR UPDATE USING (public.can_manage_org(organization_id))
WITH CHECK (public.can_manage_org(organization_id));

-- Audit logs are immutable from the app perspective. Inserts require verified tenant context.
DROP POLICY IF EXISTS "audit_logs_select_members_or_platform_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_members_or_platform_admin" ON public.audit_logs
FOR SELECT USING (public.is_platform_admin() OR public.is_org_member(organization_id));

DROP POLICY IF EXISTS "audit_logs_insert_members_or_platform_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_members_or_platform_admin" ON public.audit_logs
FOR INSERT WITH CHECK (public.can_manage_org(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-assets', 'tenant-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "tenant_assets_read_public" ON storage.objects;
CREATE POLICY "tenant_assets_read_public" ON storage.objects
FOR SELECT USING (bucket_id = 'tenant-assets');

DROP POLICY IF EXISTS "tenant_assets_write_members_or_platform_admin" ON storage.objects;
CREATE POLICY "tenant_assets_write_members_or_platform_admin" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'tenant-assets'
  and (
    public.is_platform_admin()
    or public.can_manage_org((storage.foldername(name))[1]::uuid)
  )
);

DROP POLICY IF EXISTS "tenant_assets_update_members_or_platform_admin" ON storage.objects;
CREATE POLICY "tenant_assets_update_members_or_platform_admin" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'tenant-assets'
  and (
    public.is_platform_admin()
    or public.can_manage_org((storage.foldername(name))[1]::uuid)
  )
) WITH CHECK (
  bucket_id = 'tenant-assets'
  and (
    public.is_platform_admin()
    or public.can_manage_org((storage.foldername(name))[1]::uuid)
  )
);
