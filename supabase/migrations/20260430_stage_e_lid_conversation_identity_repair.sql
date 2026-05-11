-- Stage E repair: LID conversation identity continuity
-- Evolution can send remoteJid as @lid while body.sender contains the real WhatsApp phone.
-- If an earlier conversation was created against the LID identity, later messages with the
-- resolved phone must still attach to the same conversation/lead instead of failing message integrity.

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
  v_existing_conversation_lead_id uuid;
  v_conversation_created boolean := false;
  v_raw_payload jsonb := coalesce(p_raw_payload, '{}'::jsonb);
  v_sender_name text;
  v_sender_phone_e164 text;
  v_lid_phone_e164 text;
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

  v_sender_phone_e164 := app_private.normalize_phone_e164(p_sender_phone);
  v_lid_phone_e164 := case
    when nullif(btrim(coalesce(p_external_conversation_id, '')), '') like '%@lid'
    then app_private.normalize_phone_e164(split_part(btrim(p_external_conversation_id), '@', 1))
    else null
  end;

  if nullif(btrim(coalesce(p_external_conversation_id, '')), '') is not null then
    select c.id, c.lead_id into v_conversation_id, v_existing_conversation_lead_id
    from public.conversations c
    where c.organization_id = v_channel.organization_id
      and c.channel_id = v_channel.id
      and c.external_conversation_id = btrim(p_external_conversation_id)
    limit 1;
  end if;

  if v_existing_conversation_lead_id is not null then
    -- Exact conversation identity wins over newly resolved phone identity. If the old lead
    -- was seeded with the LID as its phone, safely upgrade it to the real sender phone.
    if v_sender_phone_e164 is not null then
      update public.leads l
      set phone = case
            when nullif(btrim(coalesce(l.phone, '')), '') is null
              or l.normalized_phone_e164 is null
              or (v_lid_phone_e164 is not null and l.normalized_phone_e164 = v_lid_phone_e164)
            then p_sender_phone
            else l.phone
          end,
          updated_at = now()
      where l.id = v_existing_conversation_lead_id
        and l.organization_id = v_channel.organization_id
        and not exists (
          select 1
          from public.leads conflict_lead
          where conflict_lead.organization_id = v_channel.organization_id
            and conflict_lead.id <> l.id
            and conflict_lead.normalized_phone_e164 = v_sender_phone_e164
        );
    end if;

    select
      v_existing_conversation_lead_id::uuid as lead_id,
      'matched_existing_conversation'::text as intake_action,
      'external_conversation_id'::text as match_rule,
      case when v_sender_phone_e164 is not null then 'conversation_phone' else 'conversation' end::text as identity_confidence
    into v_intake;
  else
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
'Canonical inbound message ingestion. Resolves organization from channel, preserves exact conversation identity for WhatsApp LID continuity, calls CRM intake for new threads, stores message, and emits automation events. Direct message inserts are blocked.';
