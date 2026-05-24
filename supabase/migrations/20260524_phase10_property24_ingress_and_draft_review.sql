-- Phase 10: Property24 ingress + governed draft review audit layer
-- Backend-only operationalization. No outbound send is triggered by this migration.

create extension if not exists pgcrypto;

alter table public.messages add column if not exists status text not null default 'sent';
alter table public.messages add column if not exists sent_at timestamptz;
alter table public.messages add column if not exists external_message_id text;

alter table public.ai_message_drafts add column if not exists approved_at timestamptz;
alter table public.ai_message_drafts add column if not exists approved_by_user_id uuid references public.profiles(id) on delete set null;
alter table public.ai_message_drafts add column if not exists discarded_by_user_id uuid references public.profiles(id) on delete set null;
alter table public.ai_message_drafts add column if not exists edited_by_user_id uuid references public.profiles(id) on delete set null;

create table if not exists public.ingress_replay_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null,
  replay_key text not null,
  request_signature text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint ingress_replay_keys_source_not_blank check (length(btrim(source)) > 0),
  constraint ingress_replay_keys_key_not_blank check (length(btrim(replay_key)) > 0),
  unique (source, replay_key)
);

create index if not exists ingress_replay_keys_org_created_idx on public.ingress_replay_keys(organization_id, created_at desc);
create index if not exists ingress_replay_keys_expires_idx on public.ingress_replay_keys(expires_at);

alter table public.ingress_replay_keys enable row level security;
revoke all on public.ingress_replay_keys from anon, authenticated;

create or replace function public.review_ai_message_draft(
  p_draft_id uuid,
  p_status text,
  p_draft_content text
)
returns table (
  draft_id uuid,
  draft_status text,
  audit_event_type text
)
language plpgsql
security definer
set search_path = public, app_private
as $$
#variable_conflict use_column
declare
  v_actor uuid := auth.uid();
  v_status text := lower(btrim(coalesce(p_status, 'draft')));
  v_content text := nullif(btrim(coalesce(p_draft_content, '')), '');
  v_draft record;
  v_updated record;
  v_event_type text;
begin
  if v_actor is null then
    raise exception 'authenticated_user_required';
  end if;

  if v_status not in ('draft', 'approved', 'discarded') then
    raise exception 'invalid_draft_review_status';
  end if;

  if v_status <> 'discarded' and v_content is null then
    raise exception 'draft_content_required';
  end if;

  select d.* into v_draft
  from public.ai_message_drafts d
  where d.id = p_draft_id
  for update;

  if v_draft.id is null then
    raise exception 'draft_not_found';
  end if;

  if not (app_private.is_platform_admin() or app_private.is_org_member(v_draft.organization_id)) then
    raise exception 'org_access_required';
  end if;

  update public.ai_message_drafts d
  set status = v_status,
      draft_content = coalesce(v_content, 'Discarded draft'),
      edited_by_user_id = v_actor,
      approved_by_user_id = case when v_status = 'approved' then v_actor else null end,
      approved_at = case when v_status = 'approved' then now() else null end,
      discarded_by_user_id = case when v_status = 'discarded' then v_actor else null end,
      updated_at = now()
  where d.id = v_draft.id
  returning * into v_updated;

  v_event_type := case v_status
    when 'approved' then 'draft.approved'
    when 'discarded' then 'draft.discarded'
    else 'draft.updated'
  end;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    v_updated.organization_id,
    v_actor,
    'ai_message_' || replace(v_event_type, '.', '_'),
    'ai_message_draft',
    v_updated.id,
    jsonb_build_object(
      'draft_id', v_updated.id,
      'conversation_id', v_updated.conversation_id,
      'message_id', v_updated.message_id,
      'lead_id', v_updated.lead_id,
      'status', v_updated.status,
      'outbound_frozen', true,
      'phase', 'phase_10_backend_operationalization'
    )
  );

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
    v_updated.organization_id,
    v_event_type,
    'ai_message_draft',
    v_updated.id,
    v_updated.lead_id,
    v_updated.conversation_id,
    v_updated.message_id,
    jsonb_build_object(
      'user_id', v_actor,
      'draft_id', v_updated.id,
      'draft_status', v_updated.status,
      'outbound_frozen', true,
      'phase', 'phase_10_backend_operationalization'
    ),
    'processed',
    now()
  );

  return query select v_updated.id, v_updated.status, v_event_type;
end;
$$;

comment on function public.review_ai_message_draft(uuid, text, text) is
'Phase 10 governed draft review RPC. Persists edits/approval/discard in one transaction and writes audit_logs + automation_events. Does not send outbound messages.';

revoke all on function public.review_ai_message_draft(uuid, text, text) from public;
grant execute on function public.review_ai_message_draft(uuid, text, text) to authenticated;

create or replace function public.ingest_property24_lead(
  p_organization_slug text,
  p_external_lead_id text,
  p_external_message_id text,
  p_full_name text,
  p_email text default null,
  p_phone text default null,
  p_message_body text default null,
  p_occurred_at timestamptz default now(),
  p_listing_reference text default null,
  p_property_title text default null,
  p_estimated_value numeric default null,
  p_raw_payload jsonb default '{}'::jsonb,
  p_replay_key text default null
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
#variable_conflict use_column
declare
  v_org public.organizations%rowtype;
  v_channel public.channels%rowtype;
  v_intake record;
  v_conversation public.conversations%rowtype;
  v_message_id uuid;
  v_existing_message_id uuid;
  v_conversation_created boolean := false;
  v_raw_payload jsonb := coalesce(p_raw_payload, '{}'::jsonb);
  v_external_lead_id text := nullif(btrim(coalesce(p_external_lead_id, '')), '');
  v_external_message_id text := nullif(btrim(coalesce(p_external_message_id, '')), '');
  v_replay_key text := nullif(btrim(coalesce(p_replay_key, '')), '');
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required';
  end if;

  if jsonb_typeof(v_raw_payload) <> 'object' then
    raise exception 'raw_payload_must_be_object';
  end if;

  if nullif(btrim(coalesce(p_organization_slug, '')), '') is null
    or v_external_lead_id is null
    or nullif(btrim(coalesce(p_full_name, '')), '') is null
    or nullif(btrim(coalesce(p_message_body, '')), '') is null
    or p_occurred_at is null
    or v_replay_key is null then
    raise exception 'property24_required_fields_missing';
  end if;

  select * into v_org
  from public.organizations o
  where o.slug = btrim(p_organization_slug)
    and o.status in ('setup', 'active')
  limit 1;

  if v_org.id is null then
    raise exception 'organization_not_found';
  end if;

  insert into public.ingress_replay_keys (organization_id, source, replay_key, request_signature, expires_at)
  values (v_org.id, 'property24', v_replay_key, null, now() + interval '14 days')
  on conflict (source, replay_key) do nothing;

  if not found then
    raise exception 'duplicate_ingress_replay_key';
  end if;

  insert into public.channels (
    organization_id,
    provider,
    channel_type,
    display_name,
    external_channel_id,
    inbound_identifier,
    status,
    metadata
  ) values (
    v_org.id,
    'property24',
    'lead_portal',
    'Property24 Lead Ingress',
    'property24',
    'property24',
    'active',
    jsonb_build_object('source', 'property24', 'phase', 'phase_10_backend_operationalization')
  )
  on conflict (organization_id, provider, external_channel_id) where external_channel_id is not null
  do update set status = 'active', updated_at = now()
  returning * into v_channel;

  select * into v_intake
  from public.ingest_lead_from_intake(
    v_org.id,
    btrim(p_full_name),
    'property24',
    'lead_portal',
    v_channel.id::text,
    p_occurred_at,
    p_email,
    p_phone,
    null,
    coalesce(nullif(btrim(coalesce(p_listing_reference, '')), ''), v_external_lead_id),
    jsonb_build_object(
      'doctrine', 'phase_10_property24_ingestion',
      'exact_source', 'property24',
      'source_subtype', 'lead_portal',
      'external_lead_id', v_external_lead_id,
      'external_message_id', v_external_message_id,
      'listing_reference', nullif(btrim(coalesce(p_listing_reference, '')), ''),
      'property_title', nullif(btrim(coalesce(p_property_title, '')), ''),
      'raw_payload', v_raw_payload
    ),
    'new',
    'medium',
    p_estimated_value
  ) limit 1;

  select * into v_conversation
  from public.conversations c
  where c.organization_id = v_org.id
    and c.channel_id = v_channel.id
    and c.external_conversation_id = v_external_lead_id
  limit 1;

  if v_conversation.id is null then
    insert into public.conversations (
      organization_id,
      channel_id,
      lead_id,
      external_conversation_id,
      status,
      subject,
      last_message_at,
      metadata
    ) values (
      v_org.id,
      v_channel.id,
      v_intake.lead_id,
      v_external_lead_id,
      'open',
      coalesce(nullif(btrim(coalesce(p_property_title, '')), ''), nullif(btrim(coalesce(p_listing_reference, '')), ''), 'Property24 inquiry'),
      p_occurred_at,
      jsonb_build_object(
        'source', 'property24',
        'external_lead_id', v_external_lead_id,
        'listing_reference', nullif(btrim(coalesce(p_listing_reference, '')), ''),
        'phase', 'phase_10_backend_operationalization'
      )
    ) returning * into v_conversation;
    v_conversation_created := true;
  end if;

  if v_external_message_id is not null then
    select m.id into v_existing_message_id
    from public.messages m
    where m.organization_id = v_org.id
      and m.channel_id = v_channel.id
      and m.external_message_id = v_external_message_id
    limit 1;
  end if;

  if v_existing_message_id is not null then
    organization_id := v_org.id;
    channel_id := v_channel.id;
    conversation_id := v_conversation.id;
    message_id := v_existing_message_id;
    lead_id := v_intake.lead_id;
    intake_action := v_intake.intake_action;
    lead_match_rule := v_intake.match_rule;
    lead_identity_confidence := v_intake.identity_confidence;
    conversation_action := 'attached_existing_message';
    emitted_events := array[]::text[];
    return next;
    return;
  end if;

  perform set_config('app.ingestion_context', 'message_ingestion_v1', true);

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
    status,
    raw_payload
  ) values (
    v_org.id,
    v_channel.id,
    v_conversation.id,
    v_intake.lead_id,
    'inbound',
    'lead',
    v_external_lead_id,
    btrim(p_full_name),
    v_external_message_id,
    btrim(p_message_body),
    p_occurred_at,
    'sent',
    jsonb_build_object(
      'source', 'property24',
      'external_lead_id', v_external_lead_id,
      'external_message_id', v_external_message_id,
      'listing_reference', nullif(btrim(coalesce(p_listing_reference, '')), ''),
      'property_title', nullif(btrim(coalesce(p_property_title, '')), ''),
      'phase', 'phase_10_backend_operationalization'
    ) || v_raw_payload
  ) returning id into v_message_id;

  perform set_config('app.ingestion_context', '', true);

  update public.conversations c
  set last_message_at = greatest(coalesce(c.last_message_at, p_occurred_at), p_occurred_at),
      updated_at = now()
  where c.id = v_conversation.id;

  if v_conversation_created then
    insert into public.automation_events (organization_id, event_type, aggregate_type, aggregate_id, lead_id, conversation_id, payload)
    values (
      v_org.id,
      'conversation.created',
      'conversation',
      v_conversation.id,
      v_intake.lead_id,
      v_conversation.id,
      jsonb_build_object('source', 'property24', 'external_lead_id', v_external_lead_id, 'intake_action', v_intake.intake_action)
    );
  end if;

  insert into public.automation_events (organization_id, event_type, aggregate_type, aggregate_id, lead_id, conversation_id, message_id, payload)
  values (
    v_org.id,
    'message.received',
    'message',
    v_message_id,
    v_intake.lead_id,
    v_conversation.id,
    v_message_id,
    jsonb_build_object(
      'source', 'property24',
      'external_lead_id', v_external_lead_id,
      'external_message_id', v_external_message_id,
      'listing_reference', nullif(btrim(coalesce(p_listing_reference, '')), ''),
      'identity_confidence', v_intake.identity_confidence
    )
  );

  organization_id := v_org.id;
  channel_id := v_channel.id;
  conversation_id := v_conversation.id;
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

comment on function public.ingest_property24_lead(text, text, text, text, text, text, text, timestamptz, text, text, numeric, jsonb, text) is
'Phase 10 canonical Property24 ingress. Requires service role, replay key, preserves exact source metadata, persists lead/conversation/message, and emits automation events. Draft generation is triggered by the existing message.received event pipeline.';

revoke all on function public.ingest_property24_lead(text, text, text, text, text, text, text, timestamptz, text, text, numeric, jsonb, text) from public;
grant execute on function public.ingest_property24_lead(text, text, text, text, text, text, text, timestamptz, text, text, numeric, jsonb, text) to service_role;
