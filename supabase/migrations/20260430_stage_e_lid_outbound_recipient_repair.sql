-- Stage E LID outbound recipient repair
-- Preserve human-controlled sends while avoiding false sends to WhatsApp LID numeric ids.
-- For inbound source messages whose sender_external_id is a WhatsApp @lid, prefer
-- the sanitized Evolution payload_sample.sender @s.whatsapp.net JID when available.

create or replace function public.send_outbound_message(
  p_draft_id uuid,
  p_action text default 'prepare',
  p_delivery_status text default null,
  p_external_message_id text default null,
  p_delivery_response jsonb default '{}'::jsonb,
  p_delivery_error text default null
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
begin
  if v_actor is null then
    raise exception 'authenticated_user_required';
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
    case
      when v_draft.source_sender_external_id like '%@lid'
       and nullif(btrim(coalesce(v_draft.source_raw_payload #>> '{payload_sample,sender}', '')), '') like '%@s.whatsapp.net'
        then nullif(btrim(coalesce(v_draft.source_raw_payload #>> '{payload_sample,sender}', '')), '')
      else null
    end,
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
          'transport', 'evolution'
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
              'transport', 'evolution'
            )
      where m.id = v_existing_message.id
      returning * into v_message;
    end if;

    perform set_config('app.outbound_context', '', true);

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
          'last_error', nullif(btrim(coalesce(p_delivery_error, '')), '')
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
    'message.sent',
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
      'error', nullif(btrim(coalesce(p_delivery_error, '')), '')
    ),
    case when v_delivery_status = 'sent' then 'processed' else 'failed' end,
    v_now
  ) returning id into v_audit_id;

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

comment on function public.send_outbound_message(uuid, text, text, text, jsonb, text) is
'Canonical controlled outbound send RPC. Requires human-approved draft, validates org/thread/channel/recipient, creates one pending outbound message, finalizes Evolution delivery, and writes message.sent audit events. No auto-send.';

revoke all on function public.send_outbound_message(uuid, text, text, text, jsonb, text) from public;
grant execute on function public.send_outbound_message(uuid, text, text, text, jsonb, text) to authenticated, service_role;

grant select on public.messages to authenticated;
