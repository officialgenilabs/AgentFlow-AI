-- AgentFlow AI Phase 2 / Stage B CRM Core
-- Additive / rollback-safe CRM foundation with Lead Source Integrity Doctrine.
-- CRM first: no inbox/conversation tables are created here.

create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;

-- Pipeline foundation. Tenant-scoped, simple enough for first-client demos but durable.
create table if not exists public.lead_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  probability integer not null default 0 check (probability between 0 and 100),
  is_closed boolean not null default false,
  is_won boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (organization_id, position)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_stage_id uuid references public.lead_pipeline_stages(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  company text,
  status text not null default 'new',
  priority text not null default 'medium',
  estimated_value numeric(12,2),

  -- Lead Source Integrity Doctrine: every lead must be traceable.
  exact_source text not null,
  source_subtype text not null,
  original_inbound_channel text not null,
  source_reference text,
  captured_at timestamptz not null default now(),
  first_contact_at timestamptz,
  qualification_status text not null default 'unqualified',
  ai_qualification_decision_path jsonb not null default '[]'::jsonb,
  lead_origin_metadata jsonb not null default '{}'::jsonb,

  assigned_owner_user_id uuid references public.profiles(id) on delete set null,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint leads_status_check check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived')),
  constraint leads_priority_check check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint leads_qualification_status_check check (qualification_status in ('unqualified', 'ai_review_pending', 'ai_qualified', 'human_qualified', 'disqualified', 'nurture')),
  constraint leads_source_fields_not_blank check (
    length(btrim(exact_source)) > 0
    and length(btrim(source_subtype)) > 0
    and length(btrim(original_inbound_channel)) > 0
  ),
  constraint leads_ai_decision_path_is_array check (jsonb_typeof(ai_qualification_decision_path) = 'array'),
  constraint leads_origin_metadata_is_object check (jsonb_typeof(lead_origin_metadata) = 'object')
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  body text not null check (length(btrim(body)) > 0),
  visibility text not null default 'internal' check (visibility in ('internal', 'client_visible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  event_type text not null,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lead_events_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_at timestamptz,
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  created_by_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_pipeline_stages_org_position_idx on public.lead_pipeline_stages(organization_id, position);
create index if not exists leads_org_created_idx on public.leads(organization_id, created_at desc);
create index if not exists leads_org_owner_idx on public.leads(organization_id, assigned_owner_user_id);
create index if not exists leads_org_status_idx on public.leads(organization_id, status);
create index if not exists leads_org_pipeline_idx on public.leads(organization_id, pipeline_stage_id);
create index if not exists leads_source_trace_idx on public.leads(organization_id, exact_source, source_subtype, original_inbound_channel);
create index if not exists lead_notes_lead_created_idx on public.lead_notes(lead_id, created_at desc);
create index if not exists lead_events_lead_created_idx on public.lead_events(lead_id, created_at desc);
create index if not exists lead_events_org_created_idx on public.lead_events(organization_id, created_at desc);
create index if not exists lead_tasks_org_due_idx on public.lead_tasks(organization_id, status, due_at asc nulls last);
create index if not exists lead_tasks_lead_idx on public.lead_tasks(lead_id, created_at desc);

create or replace function app_private.is_same_org_member(org_id uuid, member_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select member_user_id is null or exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = member_user_id
      and om.status = 'active'
  );
$$;

create or replace function app_private.assert_lead_stage_and_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pipeline_stage_id is not null and not exists (
    select 1 from public.lead_pipeline_stages s
    where s.id = new.pipeline_stage_id
      and s.organization_id = new.organization_id
  ) then
    raise exception 'pipeline_stage_must_belong_to_lead_organization';
  end if;

  if new.assigned_owner_user_id is not null and not app_private.is_same_org_member(new.organization_id, new.assigned_owner_user_id) then
    raise exception 'assigned_owner_must_belong_to_same_organization';
  end if;

  new.updated_at = now();
  new.updated_by_user_id = coalesce(auth.uid(), new.updated_by_user_id);
  return new;
end;
$$;

create or replace function app_private.assert_lead_note_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_org_id uuid;
begin
  select l.organization_id into parent_org_id
  from public.leads l
  where l.id = new.lead_id;

  if parent_org_id is null or parent_org_id <> new.organization_id then
    raise exception 'lead_child_must_match_parent_organization';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.assert_lead_task_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_org_id uuid;
begin
  if new.lead_id is not null then
    select l.organization_id into parent_org_id
    from public.leads l
    where l.id = new.lead_id;

    if parent_org_id is null or parent_org_id <> new.organization_id then
      raise exception 'lead_child_must_match_parent_organization';
    end if;
  end if;

  if new.assigned_to_user_id is not null and not app_private.is_same_org_member(new.organization_id, new.assigned_to_user_id) then
    raise exception 'task_assignee_must_belong_to_same_organization';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.record_lead_event(
  p_organization_id uuid,
  p_lead_id uuid,
  p_event_type text,
  p_field_name text,
  p_old_value jsonb,
  p_new_value jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_events (organization_id, lead_id, actor_user_id, event_type, field_name, old_value, new_value, metadata)
  values (p_organization_id, p_lead_id, auth.uid(), p_event_type, p_field_name, p_old_value, p_new_value, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function app_private.record_lead_state_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform app_private.record_lead_event(
      new.organization_id,
      new.id,
      'lead.created',
      null,
      null,
      to_jsonb(new.id),
      jsonb_build_object(
        'exact_source', new.exact_source,
        'source_subtype', new.source_subtype,
        'original_inbound_channel', new.original_inbound_channel,
        'captured_at', new.captured_at,
        'source_reference', new.source_reference,
        'qualification_status', new.qualification_status,
        'assigned_owner_user_id', new.assigned_owner_user_id
      )
    );

    perform app_private.record_lead_event(
      new.organization_id,
      new.id,
      'lead.origin.captured',
      'lead_origin',
      null,
      jsonb_build_object(
        'exact_source', new.exact_source,
        'source_subtype', new.source_subtype,
        'original_inbound_channel', new.original_inbound_channel,
        'captured_at', new.captured_at,
        'metadata', new.lead_origin_metadata
      ),
      jsonb_build_object('doctrine', 'lead_source_integrity')
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    perform app_private.record_lead_event(new.organization_id, new.id, 'lead.status_changed', 'status', to_jsonb(old.status), to_jsonb(new.status));
  end if;

  if old.pipeline_stage_id is distinct from new.pipeline_stage_id then
    perform app_private.record_lead_event(new.organization_id, new.id, 'lead.pipeline_stage_changed', 'pipeline_stage_id', to_jsonb(old.pipeline_stage_id), to_jsonb(new.pipeline_stage_id));
  end if;

  if old.assigned_owner_user_id is distinct from new.assigned_owner_user_id then
    perform app_private.record_lead_event(new.organization_id, new.id, 'lead.assigned', 'assigned_owner_user_id', to_jsonb(old.assigned_owner_user_id), to_jsonb(new.assigned_owner_user_id));
  end if;

  if old.qualification_status is distinct from new.qualification_status
     or old.ai_qualification_decision_path is distinct from new.ai_qualification_decision_path then
    perform app_private.record_lead_event(
      new.organization_id,
      new.id,
      'lead.qualification_updated',
      'qualification_status',
      jsonb_build_object('qualification_status', old.qualification_status, 'ai_qualification_decision_path', old.ai_qualification_decision_path),
      jsonb_build_object('qualification_status', new.qualification_status, 'ai_qualification_decision_path', new.ai_qualification_decision_path)
    );
  end if;

  if old.first_contact_at is distinct from new.first_contact_at then
    perform app_private.record_lead_event(new.organization_id, new.id, 'lead.first_contact_recorded', 'first_contact_at', to_jsonb(old.first_contact_at), to_jsonb(new.first_contact_at));
  end if;

  return new;
end;
$$;

create or replace function app_private.record_lead_note_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.record_lead_event(new.organization_id, new.lead_id, 'lead.note_added', 'lead_notes', null, to_jsonb(new.id), jsonb_build_object('visibility', new.visibility));
  return new;
end;
$$;

create or replace function app_private.record_lead_task_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.lead_id is not null then
      perform app_private.record_lead_event(new.organization_id, new.lead_id, 'lead.task_created', 'lead_tasks', null, to_jsonb(new.id), jsonb_build_object('title', new.title, 'assigned_to_user_id', new.assigned_to_user_id, 'due_at', new.due_at));
    end if;
    return new;
  end if;

  if new.lead_id is not null and (old.status is distinct from new.status or old.assigned_to_user_id is distinct from new.assigned_to_user_id or old.due_at is distinct from new.due_at) then
    perform app_private.record_lead_event(
      new.organization_id,
      new.lead_id,
      'lead.task_updated',
      'lead_tasks',
      jsonb_build_object('status', old.status, 'assigned_to_user_id', old.assigned_to_user_id, 'due_at', old.due_at),
      jsonb_build_object('status', new.status, 'assigned_to_user_id', new.assigned_to_user_id, 'due_at', new.due_at)
    );
  end if;
  return new;
end;
$$;

create or replace function app_private.seed_default_lead_pipeline(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_pipeline_stages (organization_id, name, slug, position, probability, is_closed, is_won)
  values
    (p_organization_id, 'New', 'new', 10, 5, false, false),
    (p_organization_id, 'Contacted', 'contacted', 20, 20, false, false),
    (p_organization_id, 'Qualified', 'qualified', 30, 45, false, false),
    (p_organization_id, 'Proposal', 'proposal', 40, 70, false, false),
    (p_organization_id, 'Won', 'won', 50, 100, true, true),
    (p_organization_id, 'Lost', 'lost', 60, 0, true, false)
  on conflict (organization_id, slug) do nothing;
end;
$$;

create or replace function app_private.seed_default_lead_pipeline_for_new_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform app_private.seed_default_lead_pipeline(new.id);
  return new;
end;
$$;

drop trigger if exists organizations_seed_default_lead_pipeline_after_insert on public.organizations;
create trigger organizations_seed_default_lead_pipeline_after_insert after insert on public.organizations for each row execute function app_private.seed_default_lead_pipeline_for_new_org();

drop trigger if exists lead_pipeline_stages_touch_updated_at on public.lead_pipeline_stages;
create trigger lead_pipeline_stages_touch_updated_at before update on public.lead_pipeline_stages for each row execute function public.touch_updated_at();

drop trigger if exists leads_integrity_before_write on public.leads;
create trigger leads_integrity_before_write before insert or update on public.leads for each row execute function app_private.assert_lead_stage_and_assignment_integrity();

drop trigger if exists leads_record_state_events_after_write on public.leads;
create trigger leads_record_state_events_after_write after insert or update on public.leads for each row execute function app_private.record_lead_state_events();

drop trigger if exists lead_notes_integrity_before_write on public.lead_notes;
create trigger lead_notes_integrity_before_write before insert or update on public.lead_notes for each row execute function app_private.assert_lead_note_integrity();

drop trigger if exists lead_notes_record_event_after_insert on public.lead_notes;
create trigger lead_notes_record_event_after_insert after insert on public.lead_notes for each row execute function app_private.record_lead_note_event();

drop trigger if exists lead_tasks_integrity_before_write on public.lead_tasks;
create trigger lead_tasks_integrity_before_write before insert or update on public.lead_tasks for each row execute function app_private.assert_lead_task_integrity();

drop trigger if exists lead_tasks_record_event_after_write on public.lead_tasks;
create trigger lead_tasks_record_event_after_write after insert or update on public.lead_tasks for each row execute function app_private.record_lead_task_event();

alter table public.lead_pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_events enable row level security;
alter table public.lead_tasks enable row level security;

-- Pipeline stages
DROP POLICY IF EXISTS "lead_pipeline_stages_select_members_or_platform_admin" ON public.lead_pipeline_stages;
CREATE POLICY "lead_pipeline_stages_select_members_or_platform_admin" ON public.lead_pipeline_stages
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "lead_pipeline_stages_manage_org_admins" ON public.lead_pipeline_stages;
CREATE POLICY "lead_pipeline_stages_manage_org_admins" ON public.lead_pipeline_stages
FOR ALL USING (app_private.can_manage_org(organization_id)) WITH CHECK (app_private.can_manage_org(organization_id));

-- Leads
DROP POLICY IF EXISTS "leads_select_members_or_platform_admin" ON public.leads;
CREATE POLICY "leads_select_members_or_platform_admin" ON public.leads
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "leads_insert_members_or_platform_admin" ON public.leads;
CREATE POLICY "leads_insert_members_or_platform_admin" ON public.leads
FOR INSERT WITH CHECK (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "leads_update_members_or_platform_admin" ON public.leads;
CREATE POLICY "leads_update_members_or_platform_admin" ON public.leads
FOR UPDATE USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id))
WITH CHECK (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

-- Notes
DROP POLICY IF EXISTS "lead_notes_select_members_or_platform_admin" ON public.lead_notes;
CREATE POLICY "lead_notes_select_members_or_platform_admin" ON public.lead_notes
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "lead_notes_insert_members_or_platform_admin" ON public.lead_notes;
CREATE POLICY "lead_notes_insert_members_or_platform_admin" ON public.lead_notes
FOR INSERT WITH CHECK (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "lead_notes_update_author_or_manager" ON public.lead_notes;
CREATE POLICY "lead_notes_update_author_or_manager" ON public.lead_notes
FOR UPDATE USING (app_private.is_platform_admin() OR app_private.can_manage_org(organization_id) OR author_user_id = auth.uid())
WITH CHECK (app_private.is_platform_admin() OR app_private.can_manage_org(organization_id) OR author_user_id = auth.uid());

-- Events: immutable from the app perspective. Only SECURITY DEFINER trigger functions write history.
DROP POLICY IF EXISTS "lead_events_select_members_or_platform_admin" ON public.lead_events;
CREATE POLICY "lead_events_select_members_or_platform_admin" ON public.lead_events
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "lead_events_insert_members_or_platform_admin" ON public.lead_events;

-- Tasks
DROP POLICY IF EXISTS "lead_tasks_select_members_or_platform_admin" ON public.lead_tasks;
CREATE POLICY "lead_tasks_select_members_or_platform_admin" ON public.lead_tasks
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "lead_tasks_insert_members_or_platform_admin" ON public.lead_tasks;
CREATE POLICY "lead_tasks_insert_members_or_platform_admin" ON public.lead_tasks
FOR INSERT WITH CHECK (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "lead_tasks_update_members_or_platform_admin" ON public.lead_tasks;
CREATE POLICY "lead_tasks_update_members_or_platform_admin" ON public.lead_tasks
FOR UPDATE USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id))
WITH CHECK (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

grant select, insert, update on public.lead_pipeline_stages to authenticated;
grant select, insert, update on public.leads to authenticated;
grant select, insert, update on public.lead_notes to authenticated;
grant select on public.lead_events to authenticated;
grant select, insert, update on public.lead_tasks to authenticated;

grant execute on function app_private.is_same_org_member(uuid, uuid) to authenticated;
grant execute on function app_private.seed_default_lead_pipeline(uuid) to authenticated;

-- Seed pipeline stages for existing Stage A tenants. Safe to rerun.
select app_private.seed_default_lead_pipeline(id) from public.organizations;
