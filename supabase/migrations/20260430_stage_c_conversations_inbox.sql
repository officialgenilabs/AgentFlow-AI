-- AgentFlow AI Phase 3 / Stage C — Conversations + Inbox
-- System-layer build: messages sit on top of CRM identity/intake, never beside it.
-- Doctrine:
--   1. Channels resolve organization context.
--   2. Inbound messages must use public.ingest_inbound_message, which calls public.ingest_lead_from_intake.
--   3. Conversations may attach to leads only inside the same organization.
--   4. Direct message inserts are blocked by trigger-level ingestion context.
--   5. Outbound messaging and AI replies are intentionally out of scope.

create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  channel_type text not null default 'whatsapp',
  display_name text not null,
  external_channel_id text,
  inbound_identifier text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channels_provider_not_blank check (length(btrim(provider)) > 0),
  constraint channels_type_not_blank check (length(btrim(channel_type)) > 0),
  constraint channels_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint channels_status_check check (status in ('active', 'paused', 'disabled')),
  constraint channels_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists channels_org_provider_external_unique_idx
on public.channels (organization_id, provider, external_channel_id)
where external_channel_id is not null;

create index if not exists channels_org_status_idx on public.channels (organization_id, status);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete restrict,
  lead_id uuid references public.leads(id) on delete set null,
  external_conversation_id text,
  status text not null default 'open',
  assigned_owner_user_id uuid references public.profiles(id) on delete set null,
  subject text,
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_status_check check (status in ('open', 'handoff', 'closed')),
  constraint conversations_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists conversations_org_channel_external_unique_idx
on public.conversations (organization_id, channel_id, external_conversation_id)
where external_conversation_id is not null;

create index if not exists conversations_org_status_last_idx on public.conversations (organization_id, status, last_message_at desc nulls last);
create index if not exists conversations_org_lead_idx on public.conversations (organization_id, lead_id, updated_at desc);
create index if not exists conversations_channel_idx on public.conversations (channel_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete restrict,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  direction text not null default 'inbound',
  sender_type text not null default 'lead',
  sender_external_id text,
  sender_display_name text,
  external_message_id text,
  body text not null,
  occurred_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_direction_check check (direction in ('inbound', 'outbound', 'internal', 'system')),
  constraint messages_sender_type_check check (sender_type in ('lead', 'agent', 'system')),
  constraint messages_body_not_blank check (length(btrim(body)) > 0),
  constraint messages_raw_payload_is_object check (jsonb_typeof(raw_payload) = 'object')
);

create unique index if not exists messages_org_channel_external_unique_idx
on public.messages (organization_id, channel_id, external_message_id)
where external_message_id is not null;

create index if not exists messages_conversation_occurred_idx on public.messages (conversation_id, occurred_at asc);
create index if not exists messages_org_occurred_idx on public.messages (organization_id, occurred_at desc);
create index if not exists messages_lead_idx on public.messages (lead_id, occurred_at desc) where lead_id is not null;

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  lead_id uuid references public.leads(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint automation_events_type_not_blank check (length(btrim(event_type)) > 0),
  constraint automation_events_aggregate_type_not_blank check (length(btrim(aggregate_type)) > 0),
  constraint automation_events_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint automation_events_status_check check (status in ('pending', 'processing', 'processed', 'failed', 'ignored'))
);

create index if not exists automation_events_org_created_idx on public.automation_events (organization_id, created_at desc);
create index if not exists automation_events_type_status_idx on public.automation_events (event_type, status, created_at asc);
create index if not exists automation_events_conversation_idx on public.automation_events (conversation_id, created_at desc) where conversation_id is not null;

create or replace function app_private.assert_channel_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.provider = lower(btrim(new.provider));
  new.channel_type = lower(btrim(new.channel_type));
  new.display_name = btrim(new.display_name);
  new.external_channel_id = nullif(btrim(coalesce(new.external_channel_id, '')), '');
  new.inbound_identifier = nullif(btrim(coalesce(new.inbound_identifier, '')), '');
  new.metadata = coalesce(new.metadata, '{}'::jsonb);
  if jsonb_typeof(new.metadata) <> 'object' then
    raise exception 'channel_metadata_must_be_object';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app_private.assert_conversation_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_channel_org uuid;
  v_lead_org uuid;
begin
  select c.organization_id into v_channel_org from public.channels c where c.id = new.channel_id;
  if v_channel_org is null then
    raise exception 'conversation_channel_required';
  end if;

  if new.organization_id <> v_channel_org then
    raise exception 'conversation_must_inherit_channel_organization';
  end if;

  if new.lead_id is not null then
    select l.organization_id into v_lead_org from public.leads l where l.id = new.lead_id;
    if v_lead_org is null or v_lead_org <> new.organization_id then
      raise exception 'conversation_lead_must_match_organization';
    end if;
  end if;

  if new.assigned_owner_user_id is not null and not app_private.is_same_org_member(new.organization_id, new.assigned_owner_user_id) then
    raise exception 'conversation_assignee_must_belong_to_same_organization';
  end if;

  new.external_conversation_id = nullif(btrim(coalesce(new.external_conversation_id, '')), '');
  new.subject = nullif(btrim(coalesce(new.subject, '')), '');
  new.metadata = coalesce(new.metadata, '{}'::jsonb);
  if jsonb_typeof(new.metadata) <> 'object' then
    raise exception 'conversation_metadata_must_be_object';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

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

create or replace function app_private.assert_automation_event_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  new.payload = coalesce(new.payload, '{}'::jsonb);
  if jsonb_typeof(new.payload) <> 'object' then
    raise exception 'automation_event_payload_must_be_object';
  end if;

  if new.lead_id is not null then
    select organization_id into v_org from public.leads where id = new.lead_id;
    if v_org is null or v_org <> new.organization_id then
      raise exception 'automation_event_lead_must_match_organization';
    end if;
  end if;

  if new.conversation_id is not null then
    select organization_id into v_org from public.conversations where id = new.conversation_id;
    if v_org is null or v_org <> new.organization_id then
      raise exception 'automation_event_conversation_must_match_organization';
    end if;
  end if;

  if new.message_id is not null then
    select organization_id into v_org from public.messages where id = new.message_id;
    if v_org is null or v_org <> new.organization_id then
      raise exception 'automation_event_message_must_match_organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists assert_channel_integrity on public.channels;
create trigger assert_channel_integrity before insert or update on public.channels for each row execute function app_private.assert_channel_integrity();

drop trigger if exists assert_conversation_integrity on public.conversations;
create trigger assert_conversation_integrity before insert or update on public.conversations for each row execute function app_private.assert_conversation_integrity();

drop trigger if exists assert_message_integrity on public.messages;
create trigger assert_message_integrity before insert or update on public.messages for each row execute function app_private.assert_message_integrity();

drop trigger if exists assert_automation_event_integrity on public.automation_events;
create trigger assert_automation_event_integrity before insert or update on public.automation_events for each row execute function app_private.assert_automation_event_integrity();

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
    v_channel.provider,
    'inbound_message',
    v_channel.channel_type,
    p_occurred_at,
    p_sender_email,
    p_sender_phone,
    null,
    coalesce(nullif(btrim(coalesce(p_external_conversation_id, '')), ''), nullif(btrim(coalesce(p_sender_external_id, '')), '')),
    jsonb_build_object(
      'doctrine', 'conversation_ingestion_v1',
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

alter table public.channels enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.automation_events enable row level security;

DROP POLICY IF EXISTS "channels_select_members_or_platform_admin" ON public.channels;
CREATE POLICY "channels_select_members_or_platform_admin" ON public.channels
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "channels_manage_org_admin_or_platform_admin" ON public.channels;
CREATE POLICY "channels_manage_org_admin_or_platform_admin" ON public.channels
FOR ALL USING (app_private.can_manage_org(organization_id)) WITH CHECK (app_private.can_manage_org(organization_id));

DROP POLICY IF EXISTS "conversations_select_members_or_platform_admin" ON public.conversations;
CREATE POLICY "conversations_select_members_or_platform_admin" ON public.conversations
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "conversations_update_members_or_platform_admin" ON public.conversations;
CREATE POLICY "conversations_update_members_or_platform_admin" ON public.conversations
FOR UPDATE USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id))
WITH CHECK (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "messages_select_members_or_platform_admin" ON public.messages;
CREATE POLICY "messages_select_members_or_platform_admin" ON public.messages
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "automation_events_select_members_or_platform_admin" ON public.automation_events;
CREATE POLICY "automation_events_select_members_or_platform_admin" ON public.automation_events
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "automation_events_platform_admin_update" ON public.automation_events;
CREATE POLICY "automation_events_platform_admin_update" ON public.automation_events
FOR UPDATE USING (app_private.is_platform_admin()) WITH CHECK (app_private.is_platform_admin());

revoke all on public.channels from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.automation_events from anon, authenticated;

grant select on public.channels, public.conversations, public.messages, public.automation_events to authenticated;
grant insert, update on public.channels to authenticated;
grant update on public.conversations to authenticated;
grant execute on function public.ingest_inbound_message(uuid, text, text, text, timestamptz, text, text, text, text, jsonb) to authenticated, service_role;
