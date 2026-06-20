-- Phase 11A: channel owner mapping + fail-closed Evolution routing
-- Scope:
-- - Add first-class channel owner/default assignee fields.
-- - Add sanitized inbound routing rejection/quarantine evidence.
-- - Add provider-specific Evolution ingestion wrapper that fails closed.
-- - Propagate channel default assignee to conversations/leads.
-- - Ensure governed outbound requires explicit Evolution instance.

alter table public.channels
  add column if not exists owner_user_id uuid references public.profiles(id) on delete restrict,
  add column if not exists default_assignee_user_id uuid references public.profiles(id) on delete restrict,
  add column if not exists visibility_scope text not null default 'agency_shared',
  add column if not exists fail_closed_policy text not null default 'quarantine',
  add column if not exists created_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by_user_id uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'channels_visibility_scope_check'
      and conrelid = 'public.channels'::regclass
  ) then
    alter table public.channels
      add constraint channels_visibility_scope_check
      check (visibility_scope in ('agent_owned', 'agency_shared'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'channels_fail_closed_policy_check'
      and conrelid = 'public.channels'::regclass
  ) then
    alter table public.channels
      add constraint channels_fail_closed_policy_check
      check (fail_closed_policy in ('reject', 'quarantine'));
  end if;
end $$;

create index if not exists channels_org_owner_idx
  on public.channels (organization_id, owner_user_id)
  where owner_user_id is not null;

create index if not exists channels_org_default_assignee_idx
  on public.channels (organization_id, default_assignee_user_id)
  where default_assignee_user_id is not null;

create table if not exists public.inbound_routing_rejections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  channel_id uuid references public.channels(id) on delete set null,
  source_system text not null default 'evolution',
  provider text not null default 'evolution',
  external_channel_id_redacted text,
  external_channel_id_hash text,
  reason text not null,
  policy text not null check (policy in ('reject', 'quarantine')),
  tenant_resolution_status text not null default 'unresolved',
  owner_resolution_status text not null default 'unresolved',
  workflow_run_id text,
  remediation_hint text,
  sanitized_payload jsonb not null default '{}'::jsonb,
  payload_fingerprint text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'ignored', 'resolved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles(id) on delete set null,
  constraint inbound_routing_rejections_reason_not_blank check (length(btrim(reason)) > 0),
  constraint inbound_routing_rejections_sanitized_payload_object check (jsonb_typeof(sanitized_payload) = 'object')
);

create index if not exists inbound_routing_rejections_created_idx
  on public.inbound_routing_rejections (created_at desc);

create index if not exists inbound_routing_rejections_org_status_idx
  on public.inbound_routing_rejections (organization_id, status, created_at desc)
  where organization_id is not null;

create index if not exists inbound_routing_rejections_channel_status_idx
  on public.inbound_routing_rejections (channel_id, status, created_at desc)
  where channel_id is not null;

alter table public.inbound_routing_rejections enable row level security;

DROP POLICY IF EXISTS "inbound_routing_rejections_select_admins" ON public.inbound_routing_rejections;
CREATE POLICY "inbound_routing_rejections_select_admins" ON public.inbound_routing_rejections
FOR SELECT USING (
  app_private.is_platform_admin()
  or (
    organization_id is not null
    and app_private.can_manage_org(organization_id)
  )
);

DROP POLICY IF EXISTS "inbound_routing_rejections_update_admins" ON public.inbound_routing_rejections;
CREATE POLICY "inbound_routing_rejections_update_admins" ON public.inbound_routing_rejections
FOR UPDATE USING (
  app_private.is_platform_admin()
  or (
    organization_id is not null
    and app_private.can_manage_org(organization_id)
  )
)
WITH CHECK (
  app_private.is_platform_admin()
  or (
    organization_id is not null
    and app_private.can_manage_org(organization_id)
  )
);

create or replace function app_private.redact_identifier(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null or btrim(value) = '' then null
    when length(btrim(value)) <= 6 then repeat('*', length(btrim(value)))
    else left(btrim(value), 3) || '...' || right(btrim(value), 3)
  end;
$$;

create or replace function app_private.sha256_text(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null or value = '' then null
    else encode(extensions.digest(value, 'sha256'), 'hex')
  end;
$$;

create or replace function app_private.log_inbound_routing_rejection(
  p_organization_id uuid,
  p_channel_id uuid,
  p_provider text,
  p_external_channel_id text,
  p_reason text,
  p_policy text,
  p_tenant_resolution_status text,
  p_owner_resolution_status text,
  p_workflow_run_id text,
  p_remediation_hint text,
  p_sanitized_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_id uuid;
  v_payload jsonb := coalesce(p_sanitized_payload, '{}'::jsonb);
  v_provider text := lower(nullif(btrim(coalesce(p_provider, '')), ''));
  v_policy text := lower(nullif(btrim(coalesce(p_policy, '')), ''));
begin
  if v_provider is null then
    v_provider := 'evolution';
  end if;

  if v_policy not in ('reject', 'quarantine') then
    v_policy := 'quarantine';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    v_payload := '{}'::jsonb;
  end if;

  insert into public.inbound_routing_rejections (
    organization_id,
    channel_id,
    source_system,
    provider,
    external_channel_id_redacted,
    external_channel_id_hash,
    reason,
    policy,
    tenant_resolution_status,
    owner_resolution_status,
    workflow_run_id,
    remediation_hint,
    sanitized_payload,
    payload_fingerprint
  ) values (
    p_organization_id,
    p_channel_id,
    v_provider,
    v_provider,
    app_private.redact_identifier(p_external_channel_id),
    app_private.sha256_text(nullif(btrim(coalesce(p_external_channel_id, '')), '')),
    btrim(p_reason),
    v_policy,
    coalesce(nullif(btrim(p_tenant_resolution_status), ''), 'unresolved'),
    coalesce(nullif(btrim(p_owner_resolution_status), ''), 'unresolved'),
    nullif(btrim(coalesce(p_workflow_run_id, '')), ''),
    nullif(btrim(coalesce(p_remediation_hint, '')), ''),
    v_payload,
    app_private.sha256_text(v_payload::text)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function app_private.assert_channel_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  new.provider = lower(btrim(new.provider));
  new.channel_type = lower(btrim(new.channel_type));
  new.display_name = btrim(new.display_name);
  new.external_channel_id = nullif(btrim(coalesce(new.external_channel_id, '')), '');
  new.inbound_identifier = nullif(btrim(coalesce(new.inbound_identifier, '')), '');
  new.visibility_scope = coalesce(nullif(btrim(new.visibility_scope), ''), 'agency_shared');
  new.fail_closed_policy = coalesce(nullif(btrim(new.fail_closed_policy), ''), 'quarantine');
  new.metadata = coalesce(new.metadata, '{}'::jsonb);

  if jsonb_typeof(new.metadata) <> 'object' then
    raise exception 'channel_metadata_must_be_object';
  end if;

  if new.owner_user_id is not null and not app_private.is_same_org_member(new.organization_id, new.owner_user_id) then
    raise exception 'channel_owner_must_belong_to_same_organization';
  end if;

  if new.default_assignee_user_id is not null and not app_private.is_same_org_member(new.organization_id, new.default_assignee_user_id) then
    raise exception 'channel_default_assignee_must_belong_to_same_organization';
  end if;

  if new.provider = 'evolution'
     and new.channel_type = 'whatsapp'
     and new.status = 'active'
     and new.external_channel_id is null then
    raise exception 'active_evolution_channel_requires_external_channel_id';
  end if;

  if new.provider = 'evolution'
     and new.channel_type = 'whatsapp'
     and new.status = 'active'
     and new.visibility_scope = 'agent_owned'
     and new.default_assignee_user_id is null then
    raise exception 'active_agent_owned_channel_requires_default_assignee';
  end if;

  if new.provider = 'evolution'
     and lower(coalesce(new.external_channel_id, '')) = lower('AgentFlow_Primary')
     and coalesce(new.metadata->>'routing_scope', '') <> 'gen_i_labs_internal' then
    raise exception 'agentflow_primary_reserved_for_internal_operations';
  end if;

  new.created_by_user_id = coalesce(new.created_by_user_id, auth.uid());
  new.updated_by_user_id = coalesce(auth.uid(), new.updated_by_user_id);
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.ingest_inbound_message(
  p_channel_id uuid,
  p_external_conversation_id text,
  p_external_message_id text,
  p_message_body text,
  p_occurred_at timestamptz,
  p_sender_display_name text default null,
  p_sender_phone text default null,
  p_sender_email text default null,
  p_sender_external_id text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns table (
  organization_id uuid,
  channel_id uuid,
  conversation_id uuid,
  message_id uuid,
  lead_id uuid,
  intake_action text,
  lead_match_rule text,
  lead_identity_confidence text,
  conversation_action text,
  emitted_events text[]
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_channel record;
  v_intake record;
  v_conversation_id uuid;
  v_message_id uuid;
  v_existing_message_id uuid;
  v_conversation_created boolean := false;
  v_raw_payload jsonb := coalesce(p_raw_payload, '{}'::jsonb);
  v_sender_name text;
  v_assignment_source text;
begin
  select * into v_channel
  from public.channels c
  where c.id = p_channel_id
    and c.status = 'active';

  if v_channel.id is null then
    raise exception 'active_channel_required';
  end if;

  if jsonb_typeof(v_raw_payload) <> 'object' then
    raise exception 'raw_payload_must_be_object';
  end if;

  if nullif(btrim(coalesce(p_message_body, '')), '') is null or p_occurred_at is null then
    raise exception 'inbound_message_required_fields_missing';
  end if;

  v_assignment_source := case
    when v_channel.default_assignee_user_id is not null then 'channel.default_assignee_user_id'
    else 'unassigned'
  end;

  v_sender_name := coalesce(
    nullif(btrim(coalesce(p_sender_display_name, '')), ''),
    nullif(btrim(coalesce(p_sender_phone, '')), ''),
    nullif(btrim(coalesce(p_sender_email, '')), ''),
    'Unknown inbound lead'
  );

  select * into v_intake
  from public.ingest_lead_from_intake(
    v_channel.organization_id,
    v_sender_name,
    'whatsapp',
    'evolution',
    v_channel.id::text,
    p_occurred_at,
    p_sender_email,
    p_sender_phone,
    null,
    coalesce(nullif(btrim(coalesce(p_external_conversation_id, '')), ''), nullif(btrim(coalesce(p_sender_external_id, '')), '')),
    jsonb_build_object(
      'doctrine', 'conversation_ingestion_v1',
      'exact_source', 'whatsapp',
      'source_subtype', 'evolution',
      'original_inbound_channel', v_channel.id,
      'channel_id', v_channel.id,
      'external_channel_id', v_channel.external_channel_id,
      'external_conversation_id', nullif(btrim(coalesce(p_external_conversation_id, '')), ''),
      'external_message_id', nullif(btrim(coalesce(p_external_message_id, '')), ''),
      'routing_audit', jsonb_build_object(
        'routing_decision', 'accepted',
        'routing_provider', v_channel.provider,
        'external_channel_id', v_channel.external_channel_id,
        'channel_id', v_channel.id,
        'organization_id', v_channel.organization_id,
        'owner_user_id', v_channel.owner_user_id,
        'default_assignee_user_id', v_channel.default_assignee_user_id,
        'assignment_source', v_assignment_source,
        'visibility_scope', v_channel.visibility_scope,
        'fail_closed_policy', v_channel.fail_closed_policy
      )
    ) || v_raw_payload,
    'new',
    'medium',
    null
  ) limit 1;

  if v_intake.lead_id is not null and v_channel.default_assignee_user_id is not null then
    update public.leads l
    set assigned_owner_user_id = coalesce(l.assigned_owner_user_id, v_channel.default_assignee_user_id),
        lead_origin_metadata = coalesce(l.lead_origin_metadata, '{}'::jsonb) || jsonb_build_object(
          'routing_audit', jsonb_build_object(
            'routing_decision', 'accepted',
            'channel_id', v_channel.id,
            'external_channel_id', v_channel.external_channel_id,
            'owner_user_id', v_channel.owner_user_id,
            'default_assignee_user_id', v_channel.default_assignee_user_id,
            'assignment_source', v_assignment_source
          )
        )
    where l.id = v_intake.lead_id
      and l.organization_id = v_channel.organization_id;
  end if;

  if nullif(btrim(coalesce(p_external_conversation_id, '')), '') is not null then
    select c.id into v_conversation_id
    from public.conversations c
    where c.organization_id = v_channel.organization_id
      and c.channel_id = v_channel.id
      and c.external_conversation_id = btrim(p_external_conversation_id)
    limit 1;
  end if;

  if v_conversation_id is null and v_intake.lead_id is not null then
    select c.id into v_conversation_id
    from public.conversations c
    where c.organization_id = v_channel.organization_id
      and c.channel_id = v_channel.id
      and c.lead_id = v_intake.lead_id
      and c.status in ('open', 'handoff')
    order by c.last_message_at desc nulls last, c.created_at desc
    limit 1;
  end if;

  if v_conversation_id is null then
    insert into public.conversations (
      organization_id,
      channel_id,
      lead_id,
      external_conversation_id,
      status,
      assigned_owner_user_id,
      subject,
      last_message_at,
      metadata
    ) values (
      v_channel.organization_id,
      v_channel.id,
      v_intake.lead_id,
      nullif(btrim(coalesce(p_external_conversation_id, '')), ''),
      'open',
      v_channel.default_assignee_user_id,
      left(v_sender_name, 120),
      p_occurred_at,
      jsonb_build_object(
        'created_by', 'ingest_inbound_message',
        'intake_action', v_intake.intake_action,
        'routing_audit', jsonb_build_object(
          'routing_decision', 'accepted',
          'channel_id', v_channel.id,
          'external_channel_id', v_channel.external_channel_id,
          'owner_user_id', v_channel.owner_user_id,
          'default_assignee_user_id', v_channel.default_assignee_user_id,
          'assignment_source', v_assignment_source
        )
      )
    ) returning id into v_conversation_id;
    v_conversation_created := true;
  else
    update public.conversations c
    set lead_id = coalesce(c.lead_id, v_intake.lead_id),
        assigned_owner_user_id = coalesce(c.assigned_owner_user_id, v_channel.default_assignee_user_id),
        last_message_at = greatest(coalesce(c.last_message_at, p_occurred_at), p_occurred_at),
        metadata = coalesce(c.metadata, '{}'::jsonb) || jsonb_build_object(
          'routing_audit', jsonb_build_object(
            'routing_decision', 'accepted',
            'channel_id', v_channel.id,
            'external_channel_id', v_channel.external_channel_id,
            'owner_user_id', v_channel.owner_user_id,
            'default_assignee_user_id', v_channel.default_assignee_user_id,
            'assignment_source', v_assignment_source
          )
        ),
        updated_at = now()
    where c.id = v_conversation_id;
  end if;

  perform set_config('app.ingestion_context', 'message_ingestion_v1', true);

  if nullif(btrim(coalesce(p_external_message_id, '')), '') is not null then
    select m.id into v_existing_message_id
    from public.messages m
    where m.organization_id = v_channel.organization_id
      and m.channel_id = v_channel.id
      and m.external_message_id = btrim(p_external_message_id)
    limit 1;
  end if;

  if v_existing_message_id is not null then
    v_message_id := v_existing_message_id;
  else
    insert into public.messages (
      organization_id,
      channel_id,
      conversation_id,
      lead_id,
      direction,
      sender_type,
      sender_external_id,
      sender_display_name,
      external_message_id,
      body,
      occurred_at,
      raw_payload
    ) values (
      v_channel.organization_id,
      v_channel.id,
      v_conversation_id,
      v_intake.lead_id,
      'inbound',
      'lead',
      p_sender_external_id,
      v_sender_name,
      p_external_message_id,
      p_message_body,
      p_occurred_at,
      v_raw_payload || jsonb_build_object(
        'routing_audit', jsonb_build_object(
          'routing_decision', 'accepted',
          'channel_id', v_channel.id,
          'external_channel_id', v_channel.external_channel_id,
          'owner_user_id', v_channel.owner_user_id,
          'default_assignee_user_id', v_channel.default_assignee_user_id,
          'assignment_source', v_assignment_source
        )
      )
    ) returning id into v_message_id;
  end if;

  perform set_config('app.ingestion_context', '', true);

  update public.conversations c
  set last_message_at = greatest(coalesce(c.last_message_at, p_occurred_at), p_occurred_at),
      updated_at = now()
  where c.id = v_conversation_id;

  if v_conversation_created then
    insert into public.automation_events (organization_id, event_type, aggregate_type, aggregate_id, lead_id, conversation_id, payload)
    values (
      v_channel.organization_id,
      'conversation.created',
      'conversation',
      v_conversation_id,
      v_intake.lead_id,
      v_conversation_id,
      jsonb_build_object(
        'channel_id', v_channel.id,
        'external_channel_id', v_channel.external_channel_id,
        'external_conversation_id', nullif(btrim(coalesce(p_external_conversation_id, '')), ''),
        'intake_action', v_intake.intake_action,
        'routing_audit', jsonb_build_object(
          'routing_decision', 'accepted',
          'owner_user_id', v_channel.owner_user_id,
          'default_assignee_user_id', v_channel.default_assignee_user_id,
          'assignment_source', v_assignment_source
        )
      )
    );
  end if;

  insert into public.automation_events (organization_id, event_type, aggregate_type, aggregate_id, lead_id, conversation_id, message_id, payload)
  values (
    v_channel.organization_id,
    'message.received',
    'message',
    v_message_id,
    v_intake.lead_id,
    v_conversation_id,
    v_message_id,
    jsonb_build_object(
      'channel_id', v_channel.id,
      'external_channel_id', v_channel.external_channel_id,
      'external_message_id', nullif(btrim(coalesce(p_external_message_id, '')), ''),
      'identity_confidence', v_intake.identity_confidence,
      'routing_audit', jsonb_build_object(
        'routing_decision', 'accepted',
        'owner_user_id', v_channel.owner_user_id,
        'default_assignee_user_id', v_channel.default_assignee_user_id,
        'assignment_source', v_assignment_source
      )
    )
  );

  organization_id := v_channel.organization_id;
  channel_id := v_channel.id;
  conversation_id := v_conversation_id;
  message_id := v_message_id;
  lead_id := v_intake.lead_id;
  intake_action := v_intake.intake_action;
  lead_match_rule := v_intake.match_rule;
  lead_identity_confidence := v_intake.identity_confidence;
  conversation_action := case when v_conversation_created then 'created' else 'attached_existing' end;
  emitted_events := case when v_conversation_created then array['conversation.created', 'message.received'] else array['message.received'] end;
  return next;
end;
$$;

comment on function public.ingest_inbound_message(uuid, text, text, text, timestamptz, text, text, text, text, jsonb) is
'Canonical inbound message ingestion. Resolves organization from channel, calls CRM intake, attaches/creates a conversation, stores message, emits automation events, and propagates channel default assignee when present. Direct message inserts are blocked.';

create or replace function public.ingest_evolution_inbound_message(
  p_instance_name text,
  p_external_conversation_id text,
  p_external_message_id text,
  p_message_body text,
  p_occurred_at timestamptz,
  p_sender_display_name text default null,
  p_sender_phone text default null,
  p_sender_email text default null,
  p_sender_external_id text default null,
  p_event_type text default null,
  p_message_type text default null,
  p_from_me boolean default false,
  p_workflow_run_id text default null,
  p_raw_payload_metadata jsonb default '{}'::jsonb
)
returns table (
  routing_status text,
  rejection_id uuid,
  rejection_reason text,
  policy text,
  organization_id uuid,
  channel_id uuid,
  owner_user_id uuid,
  default_assignee_user_id uuid,
  conversation_id uuid,
  message_id uuid,
  lead_id uuid,
  intake_action text,
  conversation_action text,
  emitted_events text[]
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_instance text := nullif(btrim(coalesce(p_instance_name, '')), '');
  v_channel_count integer;
  v_channel record;
  v_ingest record;
  v_rejection_id uuid;
  v_payload jsonb := coalesce(p_raw_payload_metadata, '{}'::jsonb);
  v_sanitized jsonb;
begin
  if jsonb_typeof(v_payload) <> 'object' then
    v_payload := '{}'::jsonb;
  end if;

  v_sanitized := jsonb_strip_nulls(jsonb_build_object(
    'event_type', nullif(btrim(coalesce(p_event_type, '')), ''),
    'message_type', nullif(btrim(coalesce(p_message_type, '')), ''),
    'from_me', coalesce(p_from_me, false),
    'has_message_text', nullif(btrim(coalesce(p_message_body, '')), '') is not null,
    'has_sender_external_id', nullif(btrim(coalesce(p_sender_external_id, '')), '') is not null,
    'has_sender_phone', nullif(btrim(coalesce(p_sender_phone, '')), '') is not null,
    'external_message_id_hash', app_private.sha256_text(nullif(btrim(coalesce(p_external_message_id, '')), '')),
    'external_conversation_id_hash', app_private.sha256_text(nullif(btrim(coalesce(p_external_conversation_id, '')), '')),
    'workflow_run_id', nullif(btrim(coalesce(p_workflow_run_id, '')), ''),
    'metadata', v_payload
  ));

  if coalesce(p_from_me, false) then
    routing_status := 'ignored';
    rejection_id := null;
    rejection_reason := null;
    policy := null;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if v_instance is null then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      null, null, 'evolution', null,
      'evolution_instance_missing', 'quarantine',
      'unresolved', 'unresolved', p_workflow_run_id,
      'Evolution instance identity is required before tenant or owner attribution.',
      v_sanitized
    );
    routing_status := 'quarantined';
    rejection_id := v_rejection_id;
    rejection_reason := 'evolution_instance_missing';
    policy := 'quarantine';
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if v_instance !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      null, null, 'evolution', v_instance,
      'evolution_instance_malformed', 'reject',
      'unresolved', 'unresolved', p_workflow_run_id,
      'Instance identity contains unsupported characters or length.',
      v_sanitized
    );
    routing_status := 'rejected';
    rejection_id := v_rejection_id;
    rejection_reason := 'evolution_instance_malformed';
    policy := 'reject';
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  select count(*) into v_channel_count
  from public.channels c
  where c.provider = 'evolution'
    and lower(c.external_channel_id) = lower(v_instance);

  if v_channel_count = 0 then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      null, null, 'evolution', v_instance,
      'unknown_evolution_instance', 'quarantine',
      'unresolved', 'unresolved', p_workflow_run_id,
      'Create or correct a public.channels mapping before accepting this instance.',
      v_sanitized
    );
    routing_status := 'quarantined';
    rejection_id := v_rejection_id;
    rejection_reason := 'unknown_evolution_instance';
    policy := 'quarantine';
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if v_channel_count > 1 then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      null, null, 'evolution', v_instance,
      'ambiguous_channel_mapping', 'reject',
      'ambiguous', 'unresolved', p_workflow_run_id,
      'Multiple channels map to the same Evolution instance; do not choose a tenant automatically.',
      v_sanitized
    );
    routing_status := 'rejected';
    rejection_id := v_rejection_id;
    rejection_reason := 'ambiguous_channel_mapping';
    policy := 'reject';
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  select * into v_channel
  from public.channels c
  where c.provider = 'evolution'
    and lower(c.external_channel_id) = lower(v_instance)
  limit 1;

  if v_channel.status <> 'active' then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      v_channel.organization_id, v_channel.id, 'evolution', v_instance,
      'channel_not_active', 'reject',
      'resolved', 'unresolved', p_workflow_run_id,
      'Channel exists but is not active; enable intentionally before accepting inbound.',
      v_sanitized
    );
    routing_status := 'rejected';
    rejection_id := v_rejection_id;
    rejection_reason := 'channel_not_active';
    policy := 'reject';
    organization_id := v_channel.organization_id;
    channel_id := v_channel.id;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if lower(v_instance) = lower('AgentFlow_Primary')
     and coalesce(v_channel.metadata->>'routing_scope', '') <> 'gen_i_labs_internal' then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      v_channel.organization_id, v_channel.id, 'evolution', v_instance,
      'agentflow_primary_reserved_for_internal_operations', 'reject',
      'resolved', 'unsafe_internal_lock_missing', p_workflow_run_id,
      'AgentFlow_Primary may only be used by a channel explicitly marked routing_scope=gen_i_labs_internal.',
      v_sanitized
    );
    routing_status := 'rejected';
    rejection_id := v_rejection_id;
    rejection_reason := 'agentflow_primary_reserved_for_internal_operations';
    policy := 'reject';
    organization_id := v_channel.organization_id;
    channel_id := v_channel.id;
    owner_user_id := v_channel.owner_user_id;
    default_assignee_user_id := v_channel.default_assignee_user_id;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if v_channel.owner_user_id is null then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      v_channel.organization_id, v_channel.id, 'evolution', v_instance,
      'channel_owner_missing', 'quarantine',
      'resolved', 'owner_missing', p_workflow_run_id,
      'Set public.channels.owner_user_id before accepting this channel.',
      v_sanitized
    );
    routing_status := 'quarantined';
    rejection_id := v_rejection_id;
    rejection_reason := 'channel_owner_missing';
    policy := 'quarantine';
    organization_id := v_channel.organization_id;
    channel_id := v_channel.id;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if v_channel.default_assignee_user_id is null then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      v_channel.organization_id, v_channel.id, 'evolution', v_instance,
      'channel_default_assignee_missing', 'quarantine',
      'resolved', 'default_assignee_missing', p_workflow_run_id,
      'Set public.channels.default_assignee_user_id before accepting this channel.',
      v_sanitized
    );
    routing_status := 'quarantined';
    rejection_id := v_rejection_id;
    rejection_reason := 'channel_default_assignee_missing';
    policy := 'quarantine';
    organization_id := v_channel.organization_id;
    channel_id := v_channel.id;
    owner_user_id := v_channel.owner_user_id;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if not app_private.is_same_org_member(v_channel.organization_id, v_channel.owner_user_id) then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      v_channel.organization_id, v_channel.id, 'evolution', v_instance,
      'channel_owner_inactive_or_cross_tenant', 'quarantine',
      'resolved', 'owner_invalid', p_workflow_run_id,
      'Owner must be an active member of the channel organization.',
      v_sanitized
    );
    routing_status := 'quarantined';
    rejection_id := v_rejection_id;
    rejection_reason := 'channel_owner_inactive_or_cross_tenant';
    policy := 'quarantine';
    organization_id := v_channel.organization_id;
    channel_id := v_channel.id;
    owner_user_id := v_channel.owner_user_id;
    default_assignee_user_id := v_channel.default_assignee_user_id;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if not app_private.is_same_org_member(v_channel.organization_id, v_channel.default_assignee_user_id) then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      v_channel.organization_id, v_channel.id, 'evolution', v_instance,
      'channel_default_assignee_inactive_or_cross_tenant', 'quarantine',
      'resolved', 'default_assignee_invalid', p_workflow_run_id,
      'Default assignee must be an active member of the channel organization.',
      v_sanitized
    );
    routing_status := 'quarantined';
    rejection_id := v_rejection_id;
    rejection_reason := 'channel_default_assignee_inactive_or_cross_tenant';
    policy := 'quarantine';
    organization_id := v_channel.organization_id;
    channel_id := v_channel.id;
    owner_user_id := v_channel.owner_user_id;
    default_assignee_user_id := v_channel.default_assignee_user_id;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  if nullif(btrim(coalesce(p_message_body, '')), '') is null
     or p_occurred_at is null
     or nullif(btrim(coalesce(p_sender_external_id, '')), '') is null then
    v_rejection_id := app_private.log_inbound_routing_rejection(
      v_channel.organization_id, v_channel.id, 'evolution', v_instance,
      'inbound_payload_required_fields_missing', 'reject',
      'resolved', 'resolved', p_workflow_run_id,
      'Inbound message requires body, occurred_at, and sender_external_id.',
      v_sanitized
    );
    routing_status := 'rejected';
    rejection_id := v_rejection_id;
    rejection_reason := 'inbound_payload_required_fields_missing';
    policy := 'reject';
    organization_id := v_channel.organization_id;
    channel_id := v_channel.id;
    owner_user_id := v_channel.owner_user_id;
    default_assignee_user_id := v_channel.default_assignee_user_id;
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  select * into v_ingest
  from public.ingest_inbound_message(
    v_channel.id,
    p_external_conversation_id,
    p_external_message_id,
    p_message_body,
    p_occurred_at,
    p_sender_display_name,
    p_sender_phone,
    p_sender_email,
    p_sender_external_id,
    jsonb_build_object(
      'exact_source', 'whatsapp',
      'source_subtype', 'evolution',
      'original_inbound_channel', v_channel.id,
      'external_channel_id', v_channel.external_channel_id,
      'routing_audit', jsonb_build_object(
        'routing_decision', 'accepted',
        'routing_provider', 'evolution',
        'external_channel_id', v_channel.external_channel_id,
        'channel_id', v_channel.id,
        'organization_id', v_channel.organization_id,
        'owner_user_id', v_channel.owner_user_id,
        'default_assignee_user_id', v_channel.default_assignee_user_id,
        'assignment_source', 'channel.default_assignee_user_id',
        'visibility_scope', v_channel.visibility_scope,
        'fail_closed_policy', v_channel.fail_closed_policy
      ),
      'sanitized_payload_metadata', v_sanitized
    )
  ) limit 1;

  routing_status := 'accepted';
  rejection_id := null;
  rejection_reason := null;
  policy := null;
  organization_id := v_ingest.organization_id;
  channel_id := v_ingest.channel_id;
  owner_user_id := v_channel.owner_user_id;
  default_assignee_user_id := v_channel.default_assignee_user_id;
  conversation_id := v_ingest.conversation_id;
  message_id := v_ingest.message_id;
  lead_id := v_ingest.lead_id;
  intake_action := v_ingest.intake_action;
  conversation_action := v_ingest.conversation_action;
  emitted_events := v_ingest.emitted_events;
  return next;
end;
$$;

comment on function public.ingest_evolution_inbound_message(text, text, text, text, timestamptz, text, text, text, text, text, text, boolean, text, jsonb) is
'Phase 11A fail-closed Evolution inbound wrapper. Resolves instance to active channel, validates owner/default assignee, logs sanitized routing rejections, and calls canonical ingestion only after deterministic tenant and owner attribution.';

create or replace function public.send_outbound_message(
  p_draft_id uuid,
  p_action text default 'prepare',
  p_delivery_status text default null,
  p_external_message_id text default null,
  p_delivery_response jsonb default '{}'::jsonb,
  p_delivery_error text default null,
  p_execution_secret text default null
)
returns table (
  organization_id uuid,
  channel_id uuid,
  conversation_id uuid,
  message_id uuid,
  lead_id uuid,
  draft_id uuid,
  message_body text,
  recipient_identifier text,
  recipient_phone text,
  evolution_instance text,
  message_status text,
  can_send boolean,
  audit_event_id uuid
)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_actor uuid := auth.uid();
  v_action text := lower(btrim(coalesce(p_action, 'prepare')));
  v_draft record;
  v_message record;
  v_existing_message record;
  v_channel record;
  v_lead record;
  v_profile record;
  v_delivery_response jsonb := coalesce(p_delivery_response, '{}'::jsonb);
  v_delivery_status text := lower(nullif(btrim(coalesce(p_delivery_status, '')), ''));
  v_now timestamptz := now();
  v_audit_id uuid;
  v_attempt_count integer := 0;
  v_expected_secret_digest text;
  v_existing_requested_at timestamptz;
begin
  if v_actor is null then
    raise exception 'authenticated_user_required';
  end if;

  select s.secret_digest into v_expected_secret_digest
  from app_private.ingress_endpoint_secrets s
  where s.source = 'governed_outbound';

  if v_expected_secret_digest is null
    or nullif(btrim(coalesce(p_execution_secret, '')), '') is null
    or encode(extensions.digest(p_execution_secret, 'sha256'), 'hex') <> v_expected_secret_digest then
    raise exception 'invalid_outbound_execution_secret';
  end if;

  if v_action not in ('prepare', 'finalize') then
    raise exception 'invalid_send_action';
  end if;

  if jsonb_typeof(v_delivery_response) <> 'object' then
    raise exception 'delivery_response_must_be_object';
  end if;

  select d.*,
         c.organization_id as conversation_org_id,
         c.channel_id as conversation_channel_id,
         c.lead_id as conversation_lead_id,
         c.external_conversation_id,
         c.status as conversation_status,
         m.direction as source_message_direction,
         m.sender_external_id as source_sender_external_id,
         m.sender_display_name as source_sender_display_name,
         m.body as source_message_body,
         m.raw_payload as source_raw_payload
  into v_draft
  from public.ai_message_drafts d
  join public.conversations c on c.id = d.conversation_id
  join public.messages m on m.id = d.message_id
  where d.id = p_draft_id
  for update of d;

  if v_draft.id is null then
    raise exception 'outbound_draft_not_found';
  end if;

  if v_draft.organization_id <> v_draft.conversation_org_id then
    raise exception 'draft_conversation_org_mismatch';
  end if;

  if not (app_private.is_platform_admin() or app_private.is_org_member(v_draft.organization_id)) then
    raise exception 'org_access_required';
  end if;

  if v_draft.source_message_direction <> 'inbound' then
    raise exception 'send_requires_inbound_source_message';
  end if;

  if v_draft.status <> 'approved' or v_draft.approved_by_user_id is null or v_draft.approved_at is null then
    raise exception 'outbound_draft_must_be_approved';
  end if;

  select * into v_channel
  from public.channels ch
  where ch.id = v_draft.conversation_channel_id
    and ch.organization_id = v_draft.organization_id
    and ch.status = 'active';

  if v_channel.id is null then
    raise exception 'active_channel_required_for_send';
  end if;

  evolution_instance := nullif(btrim(coalesce(v_channel.external_channel_id, '')), '');

  if evolution_instance is null then
    raise exception 'outbound_evolution_instance_required';
  end if;

  if v_channel.provider <> 'evolution' then
    raise exception 'outbound_evolution_channel_required';
  end if;

  if lower(evolution_instance) = lower('AgentFlow_Primary')
     and coalesce(v_channel.metadata->>'routing_scope', '') <> 'gen_i_labs_internal' then
    raise exception 'agentflow_primary_reserved_for_internal_operations';
  end if;

  if v_channel.default_assignee_user_id is null or not app_private.is_same_org_member(v_channel.organization_id, v_channel.default_assignee_user_id) then
    raise exception 'outbound_channel_default_assignee_required';
  end if;

  select * into v_lead
  from public.leads l
  where l.id = coalesce(v_draft.lead_id, v_draft.conversation_lead_id);

  select * into v_profile
  from public.profiles p
  where p.id = v_actor;

  recipient_identifier := coalesce(
    nullif(btrim(coalesce(v_lead.normalized_phone_e164, '')), ''),
    nullif(btrim(coalesce(v_lead.phone, '')), ''),
    nullif(btrim(coalesce(v_draft.source_sender_external_id, '')), ''),
    nullif(btrim(coalesce(v_draft.external_conversation_id, '')), '')
  );

  recipient_phone := case
    when recipient_identifier is null then null
    when recipient_identifier like '%@s.whatsapp.net' then split_part(recipient_identifier, '@', 1)
    when recipient_identifier like '%@lid' then null
    else regexp_replace(recipient_identifier, '[^0-9]', '', 'g')
  end;

  if recipient_phone is null or length(recipient_phone) < 8 then
    raise exception 'sendable_recipient_phone_required';
  end if;

  select * into v_existing_message
  from public.messages m
  where m.organization_id = v_draft.organization_id
    and m.direction = 'outbound'
    and m.raw_payload->>'draft_id' = v_draft.id::text
  order by m.created_at asc
  limit 1
  for update;

  if v_action = 'prepare' then
    if v_existing_message.id is not null and v_existing_message.status = 'sent' then
      raise exception 'duplicate_send_prevented';
    end if;

    if v_existing_message.id is not null and v_existing_message.status = 'pending' then
      v_existing_requested_at := coalesce((v_existing_message.raw_payload->>'send_requested_at')::timestamptz, v_existing_message.created_at);
      if v_existing_requested_at > v_now - interval '10 minutes' then
        raise exception 'outbound_send_already_pending';
      end if;
    end if;

    v_attempt_count := coalesce((v_existing_message.raw_payload->>'delivery_attempts')::integer, 0) + 1;
    perform set_config('app.outbound_context', 'controlled_outbound_send_v1', true);

    if v_existing_message.id is null then
      insert into public.messages (
        organization_id,
        channel_id,
        conversation_id,
        lead_id,
        direction,
        sender_type,
        sender_external_id,
        sender_display_name,
        body,
        occurred_at,
        status,
        raw_payload
      ) values (
        v_draft.organization_id,
        v_draft.conversation_channel_id,
        v_draft.conversation_id,
        coalesce(v_draft.lead_id, v_draft.conversation_lead_id),
        'outbound',
        'agent',
        v_actor::text,
        coalesce(nullif(btrim(coalesce(v_profile.full_name, '')), ''), nullif(btrim(coalesce(v_profile.email, '')), ''), 'AgentFlow user'),
        v_draft.draft_content,
        v_now,
        'pending',
        jsonb_build_object(
          'draft_id', v_draft.id,
          'source_message_id', v_draft.message_id,
          'approved_by_user_id', v_draft.approved_by_user_id,
          'approved_at', v_draft.approved_at,
          'send_requested_by_user_id', v_actor,
          'send_requested_at', v_now,
          'recipient_identifier', recipient_identifier,
          'recipient_phone', recipient_phone,
          'delivery_attempts', v_attempt_count,
          'transport', 'evolution',
          'evolution_instance', evolution_instance,
          'phase', 'phase_11a_fail_closed_routing'
        )
      ) returning * into v_message;
    else
      update public.messages m
      set status = 'pending',
          body = v_draft.draft_content,
          occurred_at = v_now,
          external_message_id = null,
          sent_at = null,
          raw_payload = coalesce(m.raw_payload, '{}'::jsonb)
            || jsonb_build_object(
              'send_requested_by_user_id', v_actor,
              'send_requested_at', v_now,
              'recipient_identifier', recipient_identifier,
              'recipient_phone', recipient_phone,
              'delivery_attempts', v_attempt_count,
              'last_retry_at', v_now,
              'last_error', null,
              'transport', 'evolution',
              'evolution_instance', evolution_instance,
              'phase', 'phase_11a_fail_closed_routing'
            )
      where m.id = v_existing_message.id
      returning * into v_message;
    end if;

    perform set_config('app.outbound_context', '', true);

    insert into public.audit_logs (
      organization_id,
      actor_user_id,
      action,
      target_type,
      target_id,
      metadata
    ) values (
      v_message.organization_id,
      v_actor,
      'outbound_message_prepared',
      'message',
      v_message.id,
      jsonb_build_object(
        'draft_id', v_draft.id,
        'conversation_id', v_message.conversation_id,
        'lead_id', v_message.lead_id,
        'delivery_attempts', v_attempt_count,
        'recipient_phone_last4', right(recipient_phone, 4),
        'transport', 'evolution',
        'evolution_instance', evolution_instance,
        'phase', 'phase_11a_fail_closed_routing'
      )
    );

    organization_id := v_message.organization_id;
    channel_id := v_message.channel_id;
    conversation_id := v_message.conversation_id;
    message_id := v_message.id;
    lead_id := v_message.lead_id;
    draft_id := v_draft.id;
    message_body := v_message.body;
    message_status := v_message.status;
    can_send := true;
    audit_event_id := null;
    return next;
    return;
  end if;

  if v_existing_message.id is null then
    raise exception 'outbound_message_prepare_required';
  end if;

  if v_existing_message.status = 'sent' then
    raise exception 'duplicate_send_prevented';
  end if;

  if v_delivery_status not in ('sent', 'failed') then
    raise exception 'final_delivery_status_required';
  end if;

  perform set_config('app.outbound_context', 'controlled_outbound_send_v1', true);

  update public.messages m
  set status = v_delivery_status,
      external_message_id = case when v_delivery_status = 'sent' then nullif(btrim(coalesce(p_external_message_id, '')), '') else null end,
      sent_at = case when v_delivery_status = 'sent' then v_now else null end,
      raw_payload = coalesce(m.raw_payload, '{}'::jsonb)
        || jsonb_build_object(
          'delivery_status', v_delivery_status,
          'delivery_finalized_by_user_id', v_actor,
          'delivery_finalized_at', v_now,
          'evolution_response', v_delivery_response,
          'last_error', nullif(btrim(coalesce(p_delivery_error, '')), ''),
          'evolution_instance', evolution_instance,
          'phase', 'phase_11a_fail_closed_routing'
        )
  where m.id = v_existing_message.id
  returning * into v_message;

  perform set_config('app.outbound_context', '', true);

  update public.conversations c
  set last_message_at = case when v_delivery_status = 'sent' then greatest(coalesce(c.last_message_at, v_message.occurred_at), v_message.occurred_at) else c.last_message_at end,
      updated_at = now()
  where c.id = v_message.conversation_id;

  insert into public.automation_events (
    organization_id,
    event_type,
    aggregate_type,
    aggregate_id,
    lead_id,
    conversation_id,
    message_id,
    payload,
    status,
    processed_at
  ) values (
    v_message.organization_id,
    case when v_delivery_status = 'sent' then 'message.sent' else 'message.failed' end,
    'message',
    v_message.id,
    v_message.lead_id,
    v_message.conversation_id,
    v_message.id,
    jsonb_build_object(
      'user_id', v_actor,
      'org_id', v_message.organization_id,
      'conversation_id', v_message.conversation_id,
      'message_id', v_message.id,
      'draft_id', v_draft.id,
      'delivery_status', v_delivery_status,
      'external_message_id', nullif(btrim(coalesce(p_external_message_id, '')), ''),
      'transport', 'evolution',
      'evolution_instance', evolution_instance,
      'error', nullif(btrim(coalesce(p_delivery_error, '')), ''),
      'phase', 'phase_11a_fail_closed_routing'
    ),
    case when v_delivery_status = 'sent' then 'processed' else 'failed' end,
    v_now
  ) returning id into v_audit_id;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    v_message.organization_id,
    v_actor,
    case when v_delivery_status = 'sent' then 'outbound_message_sent' else 'outbound_message_failed' end,
    'message',
    v_message.id,
    jsonb_build_object(
      'draft_id', v_draft.id,
      'conversation_id', v_message.conversation_id,
      'lead_id', v_message.lead_id,
      'delivery_status', v_delivery_status,
      'external_message_id', nullif(btrim(coalesce(p_external_message_id, '')), ''),
      'automation_event_id', v_audit_id,
      'transport', 'evolution',
      'evolution_instance', evolution_instance,
      'error', nullif(btrim(coalesce(p_delivery_error, '')), ''),
      'phase', 'phase_11a_fail_closed_routing'
    )
  );

  organization_id := v_message.organization_id;
  channel_id := v_message.channel_id;
  conversation_id := v_message.conversation_id;
  message_id := v_message.id;
  lead_id := v_message.lead_id;
  draft_id := v_draft.id;
  message_body := v_message.body;
  message_status := v_message.status;
  can_send := false;
  audit_event_id := v_audit_id;
  return next;
end;
$$;

comment on function public.send_outbound_message(uuid, text, text, text, jsonb, text, text) is
'Phase 11A governed outbound RPC. Requires authenticated org access, approved draft, server-held execution secret, explicit active Evolution channel instance, and prepare-before-finalize. It does not call external transport directly.';

revoke all on function public.ingest_evolution_inbound_message(text, text, text, text, timestamptz, text, text, text, text, text, text, boolean, text, jsonb) from public, anon;
grant execute on function public.ingest_evolution_inbound_message(text, text, text, text, timestamptz, text, text, text, text, text, text, boolean, text, jsonb) to authenticated, service_role;

grant select, update on public.inbound_routing_rejections to authenticated;

grant execute on function app_private.log_inbound_routing_rejection(uuid, uuid, text, text, text, text, text, text, text, text, jsonb) to authenticated, service_role;
