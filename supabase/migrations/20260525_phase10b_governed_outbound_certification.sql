-- Phase 10B: governed outbound execution certification layer
-- Backend-only hardening. Keeps outbound server-controlled and human-approved.

create extension if not exists pgcrypto;

alter table public.messages add column if not exists status text not null default 'sent';
alter table public.messages add column if not exists sent_at timestamptz;
alter table public.messages add column if not exists external_message_id text;

create table if not exists app_private.ingress_endpoint_secrets (
  source text primary key,
  secret_digest text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingress_endpoint_secrets_source_not_blank check (length(btrim(source)) > 0),
  constraint ingress_endpoint_secrets_digest_not_blank check (length(btrim(secret_digest)) > 0)
);

revoke all on app_private.ingress_endpoint_secrets from public, anon, authenticated;

drop function if exists public.review_ai_message_draft(uuid, text, text);

create or replace function public.review_ai_message_draft(
  p_draft_id uuid,
  p_status text,
  p_draft_content text,
  p_outbound_frozen boolean default true
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
  v_outbound_frozen boolean := coalesce(p_outbound_frozen, true);
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
      'outbound_frozen', v_outbound_frozen,
      'outbound_governance', case when v_status = 'approved' and not v_outbound_frozen then 'human_approved_for_governed_send' else 'human_review_required' end,
      'phase', 'phase_10b_governed_outbound'
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
      'outbound_frozen', v_outbound_frozen,
      'outbound_governance', case when v_status = 'approved' and not v_outbound_frozen then 'human_approved_for_governed_send' else 'human_review_required' end,
      'phase', 'phase_10b_governed_outbound'
    ),
    'processed',
    now()
  );

  return query select v_updated.id, v_updated.status, v_event_type;
end;
$$;

comment on function public.review_ai_message_draft(uuid, text, text, boolean) is
'Phase 10B governed draft review RPC. Persists edits/approval/discard in one transaction and writes audit_logs + automation_events. Sending remains separate and server-controlled.';

revoke all on function public.review_ai_message_draft(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.review_ai_message_draft(uuid, text, text, boolean) to authenticated;

create or replace function app_private.assert_message_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation record;
  v_channel_org uuid;
  v_lead_org uuid;
  v_ingestion_context text := current_setting('app.ingestion_context', true);
  v_outbound_context text := current_setting('app.outbound_context', true);
begin
  if new.direction = 'inbound' then
    if v_ingestion_context <> 'message_ingestion_v1' then
      raise exception 'messages_must_use_ingest_inbound_message';
    end if;
  elsif new.direction = 'outbound' then
    if v_outbound_context <> 'controlled_outbound_send_v1' then
      raise exception 'outbound_messages_must_use_send_outbound_message';
    end if;
    if new.sender_type <> 'agent' then
      raise exception 'outbound_sender_must_be_agent';
    end if;
    if new.status not in ('pending', 'sent', 'failed') then
      raise exception 'outbound_status_invalid';
    end if;
  else
    raise exception 'messages_must_use_controlled_ingestion_or_send_path';
  end if;

  select c.organization_id, c.channel_id, c.lead_id into v_conversation
  from public.conversations c
  where c.id = new.conversation_id;

  if v_conversation.organization_id is null then
    raise exception 'message_conversation_required';
  end if;

  if new.organization_id <> v_conversation.organization_id then
    raise exception 'message_must_match_conversation_organization';
  end if;

  if new.channel_id <> v_conversation.channel_id then
    raise exception 'message_channel_must_match_conversation_channel';
  end if;

  select ch.organization_id into v_channel_org from public.channels ch where ch.id = new.channel_id;
  if v_channel_org is null or v_channel_org <> new.organization_id then
    raise exception 'message_channel_must_match_organization';
  end if;

  if new.lead_id is not null then
    select l.organization_id into v_lead_org from public.leads l where l.id = new.lead_id;
    if v_lead_org is null or v_lead_org <> new.organization_id then
      raise exception 'message_lead_must_match_organization';
    end if;
  end if;

  if v_conversation.lead_id is not null and new.lead_id is not null and v_conversation.lead_id <> new.lead_id then
    raise exception 'message_lead_must_match_conversation_lead';
  end if;

  new.external_message_id = nullif(btrim(coalesce(new.external_message_id, '')), '');
  new.sender_external_id = nullif(btrim(coalesce(new.sender_external_id, '')), '');
  new.sender_display_name = nullif(btrim(coalesce(new.sender_display_name, '')), '');
  new.body = btrim(new.body);
  new.raw_payload = coalesce(new.raw_payload, '{}'::jsonb);
  if jsonb_typeof(new.raw_payload) <> 'object' then
    raise exception 'message_raw_payload_must_be_object';
  end if;

  if new.direction = 'outbound' and nullif(new.raw_payload->>'draft_id', '') is null then
    raise exception 'outbound_message_requires_draft_id';
  end if;

  return new;
end;
$$;

drop function if exists public.send_outbound_message(uuid, text, text, text, jsonb, text);

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

  evolution_instance := coalesce(
    nullif(btrim(coalesce(v_channel.metadata->>'evolution_instance', '')), ''),
    nullif(btrim(coalesce(v_channel.external_channel_id, '')), '')
  );

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
          'phase', 'phase_10b_governed_outbound'
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
              'phase', 'phase_10b_governed_outbound'
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
        'phase', 'phase_10b_governed_outbound'
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
          'phase', 'phase_10b_governed_outbound'
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
      'error', nullif(btrim(coalesce(p_delivery_error, '')), ''),
      'phase', 'phase_10b_governed_outbound'
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
      'error', nullif(btrim(coalesce(p_delivery_error, '')), ''),
      'phase', 'phase_10b_governed_outbound'
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
'Phase 10B governed outbound RPC. Requires authenticated org access, approved draft, server-held execution secret, prepare-before-finalize, and writes message/audit/automation evidence. It does not call external transport directly.';

revoke all on function public.send_outbound_message(uuid, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.send_outbound_message(uuid, text, text, text, jsonb, text, text) to authenticated;
