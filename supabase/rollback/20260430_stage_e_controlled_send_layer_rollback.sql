-- Rollback: Stage E Controlled Send Layer
-- Use only with matching application rollback to pre-Stage-E UI/actions.

revoke all on function public.send_outbound_message(uuid, text, text, text, jsonb, text) from public;
drop function if exists public.send_outbound_message(uuid, text, text, text, jsonb, text);

drop index if exists public.messages_outbound_draft_one_active_idx;
drop index if exists public.messages_outbound_draft_idx;
drop index if exists public.messages_org_status_idx;
drop index if exists public.ai_message_drafts_approved_idx;

alter table public.messages drop constraint if exists messages_status_check;
alter table public.messages drop column if exists status;
alter table public.messages drop column if exists sent_at;
alter table public.ai_message_drafts drop column if exists approved_at;

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
begin
  if v_ingestion_context <> 'message_ingestion_v1' then
    raise exception 'messages_must_use_ingest_inbound_message';
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

  return new;
end;
$$;

create or replace function app_private.assert_ai_message_draft_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_message record;
  v_conversation record;
begin
  select m.organization_id, m.conversation_id, m.lead_id, m.direction
  into v_message
  from public.messages m
  where m.id = new.message_id;

  if v_message.organization_id is null then
    raise exception 'draft_message_required';
  end if;

  select c.organization_id, c.lead_id, c.status
  into v_conversation
  from public.conversations c
  where c.id = new.conversation_id;

  if v_conversation.organization_id is null then
    raise exception 'draft_conversation_required';
  end if;

  if new.organization_id <> v_message.organization_id
     or new.organization_id <> v_conversation.organization_id
     or new.conversation_id <> v_message.conversation_id then
    raise exception 'draft_cross_org_or_thread_mismatch';
  end if;

  if coalesce(new.lead_id, v_message.lead_id, v_conversation.lead_id) is not null
     and new.lead_id is not null
     and new.lead_id is distinct from coalesce(v_message.lead_id, v_conversation.lead_id) then
    raise exception 'draft_lead_mismatch';
  end if;

  if v_message.direction <> 'inbound' then
    raise exception 'drafts_only_for_inbound_messages';
  end if;

  return new;
end;
$$;
