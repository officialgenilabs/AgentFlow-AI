-- Stage C activation hardening: real inbound channel identity + canonical intake metadata
-- Ensures Evolution instance/channel identity maps to one channel and CRM intake receives
-- exact_source='whatsapp', source_subtype='evolution', original_inbound_channel=<channel id>.

create unique index if not exists channels_provider_external_global_unique_idx
on public.channels (provider, external_channel_id)
where external_channel_id is not null;

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
      'external_conversation_id', nullif(btrim(coalesce(p_external_conversation_id, '')), ''),
      'external_message_id', nullif(btrim(coalesce(p_external_message_id, '')), '')
    ) || v_raw_payload,
    'new',
    'medium',
    null
  ) limit 1;

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
      subject,
      last_message_at,
      metadata
    ) values (
      v_channel.organization_id,
      v_channel.id,
      v_intake.lead_id,
      nullif(btrim(coalesce(p_external_conversation_id, '')), ''),
      'open',
      left(v_sender_name, 120),
      p_occurred_at,
      jsonb_build_object('created_by', 'ingest_inbound_message', 'intake_action', v_intake.intake_action)
    ) returning id into v_conversation_id;
    v_conversation_created := true;
  else
    update public.conversations c
    set lead_id = coalesce(c.lead_id, v_intake.lead_id),
        last_message_at = greatest(coalesce(c.last_message_at, p_occurred_at), p_occurred_at),
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
      v_raw_payload
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
      jsonb_build_object('channel_id', v_channel.id, 'external_conversation_id', nullif(btrim(coalesce(p_external_conversation_id, '')), ''), 'intake_action', v_intake.intake_action)
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
    jsonb_build_object('channel_id', v_channel.id, 'external_message_id', nullif(btrim(coalesce(p_external_message_id, '')), ''), 'identity_confidence', v_intake.identity_confidence)
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
'Canonical inbound message ingestion. Resolves organization from channel, calls CRM intake, attaches/creates a conversation, stores message, and emits automation events. Direct message inserts are blocked.';
