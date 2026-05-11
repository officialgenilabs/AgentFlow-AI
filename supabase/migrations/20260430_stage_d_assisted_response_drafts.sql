-- Stage D: Assisted Response Layer (NO AUTO-SEND)
-- AI suggestions are drafts only. No outbound transport, no Evolution send, no automated replies.

create extension if not exists pgcrypto;

create table if not exists public.ai_message_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  draft_content text not null,
  status text not null default 'draft',
  generation_model text not null default 'agentflow_assisted_draft_v1',
  generation_context jsonb not null default '{}'::jsonb,
  edited_by_user_id uuid references public.profiles(id) on delete set null,
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  discarded_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_message_drafts_status_check check (status in ('draft', 'approved', 'discarded')),
  constraint ai_message_drafts_content_not_blank check (length(btrim(draft_content)) > 0),
  constraint ai_message_drafts_context_object_check check (jsonb_typeof(generation_context) = 'object')
);

alter table public.ai_message_drafts add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.ai_message_drafts add column if not exists lead_id uuid references public.leads(id) on delete set null;
alter table public.ai_message_drafts add column if not exists generation_model text not null default 'agentflow_assisted_draft_v1';
alter table public.ai_message_drafts add column if not exists generation_context jsonb not null default '{}'::jsonb;
alter table public.ai_message_drafts add column if not exists edited_by_user_id uuid references public.profiles(id) on delete set null;
alter table public.ai_message_drafts add column if not exists approved_by_user_id uuid references public.profiles(id) on delete set null;
alter table public.ai_message_drafts add column if not exists discarded_by_user_id uuid references public.profiles(id) on delete set null;
alter table public.ai_message_drafts add column if not exists updated_at timestamptz not null default now();

create unique index if not exists ai_message_drafts_message_unique_idx on public.ai_message_drafts(message_id);
create index if not exists ai_message_drafts_org_created_idx on public.ai_message_drafts(organization_id, created_at desc);
create index if not exists ai_message_drafts_conversation_created_idx on public.ai_message_drafts(conversation_id, created_at desc);
create index if not exists ai_message_drafts_status_idx on public.ai_message_drafts(status, created_at desc);

drop trigger if exists touch_ai_message_drafts_updated_at on public.ai_message_drafts;
create trigger touch_ai_message_drafts_updated_at before update on public.ai_message_drafts for each row execute function public.touch_updated_at();

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

drop trigger if exists assert_ai_message_draft_integrity on public.ai_message_drafts;
create trigger assert_ai_message_draft_integrity before insert or update on public.ai_message_drafts for each row execute function app_private.assert_ai_message_draft_integrity();

create or replace function public.generate_ai_reply_draft_for_message(p_message_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_message record;
  v_conversation record;
  v_lead record;
  v_history jsonb := '[]'::jsonb;
  v_name text;
  v_body_lower text;
  v_draft text;
  v_draft_id uuid;
begin
  select * into v_message
  from public.messages m
  where m.id = p_message_id;

  if v_message.id is null then
    raise exception 'message_not_found';
  end if;

  if v_message.direction <> 'inbound' then
    return null;
  end if;

  select * into v_conversation
  from public.conversations c
  where c.id = v_message.conversation_id;

  if v_conversation.id is null or v_conversation.status <> 'open' then
    return null;
  end if;

  select * into v_lead
  from public.leads l
  where l.id = coalesce(v_message.lead_id, v_conversation.lead_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id,
    'direction', x.direction,
    'sender_type', x.sender_type,
    'body', x.body,
    'occurred_at', x.occurred_at
  ) order by x.occurred_at asc), '[]'::jsonb)
  into v_history
  from (
    select m.id, m.direction, m.sender_type, m.body, m.occurred_at
    from public.messages m
    where m.organization_id = v_message.organization_id
      and m.conversation_id = v_message.conversation_id
    order by m.occurred_at desc, m.created_at desc
    limit 5
  ) x;

  v_name := nullif(split_part(coalesce(v_lead.full_name, v_message.sender_display_name, ''), ' ', 1), '');
  v_body_lower := lower(coalesce(v_message.body, ''));

  if v_body_lower like '%viewing%' or v_body_lower like '%view%' then
    v_draft := format(
      'Hi%s, thanks for reaching out. I can help with that. Just to confirm, you’re looking to arrange a viewing based on your message. Could you please share your preferred viewing times, your budget range, and any must-have requirements? Once I have that, we can line up the best next steps for you.',
      case when v_name is not null then ' ' || v_name else '' end
    );
  elsif v_body_lower like '%bedroom%' or v_body_lower like '%house%' or v_body_lower like '%property%' or v_body_lower like '%sandton%' then
    v_draft := format(
      'Hi%s, thanks for your message. I’d be happy to help you with the property search. Could you please confirm your preferred area, budget range, ideal move-in timing, and any must-have features? From there, we can narrow this down and arrange a suitable viewing.',
      case when v_name is not null then ' ' || v_name else '' end
    );
  else
    v_draft := format(
      'Hi%s, thanks for your message. I’d be happy to help. Could you share a little more detail about what you’re looking for and your preferred timing? Once I have that, I can guide you on the best next step.',
      case when v_name is not null then ' ' || v_name else '' end
    );
  end if;

  insert into public.ai_message_drafts (
    organization_id,
    conversation_id,
    message_id,
    lead_id,
    draft_content,
    status,
    generation_model,
    generation_context
  ) values (
    v_message.organization_id,
    v_message.conversation_id,
    v_message.id,
    coalesce(v_message.lead_id, v_conversation.lead_id),
    v_draft,
    'draft',
    'agentflow_assisted_draft_v1',
    jsonb_build_object(
      'doctrine', 'stage_d_no_auto_send',
      'rules', jsonb_build_array('draft_only', 'human_approval_required', 'no_outbound_transport', 'no_auto_send'),
      'conversation_status', v_conversation.status,
      'last_message', v_message.body,
      'lead', jsonb_build_object('id', v_lead.id, 'full_name', v_lead.full_name, 'phone', v_lead.phone, 'email', v_lead.email, 'identity_confidence', v_lead.identity_confidence),
      'history_last_5', v_history
    )
  )
  on conflict (message_id) do update
  set draft_content = case
        when public.ai_message_drafts.status = 'draft' then excluded.draft_content
        else public.ai_message_drafts.draft_content
      end,
      generation_context = case
        when public.ai_message_drafts.status = 'draft' then excluded.generation_context
        else public.ai_message_drafts.generation_context
      end,
      generation_model = case
        when public.ai_message_drafts.status = 'draft' then excluded.generation_model
        else public.ai_message_drafts.generation_model
      end,
      updated_at = case
        when public.ai_message_drafts.status = 'draft' then now()
        else public.ai_message_drafts.updated_at
      end
  returning id into v_draft_id;

  return v_draft_id;
end;
$$;

comment on function public.generate_ai_reply_draft_for_message(uuid) is
'Creates/refreshes an assisted reply draft for an inbound message in an open conversation. Draft-only: no outbound transport and no automatic sends.';

create or replace function app_private.create_ai_draft_on_message_received_event()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_conversation_status text;
begin
  if new.event_type <> 'message.received' or new.message_id is null then
    return new;
  end if;

  select c.status into v_conversation_status
  from public.conversations c
  where c.id = new.conversation_id;

  if v_conversation_status = 'open' then
    perform public.generate_ai_reply_draft_for_message(new.message_id);
  end if;

  return new;
end;
$$;

drop trigger if exists create_ai_draft_on_message_received_event on public.automation_events;
create trigger create_ai_draft_on_message_received_event
  after insert on public.automation_events
  for each row
  execute function app_private.create_ai_draft_on_message_received_event();

alter table public.ai_message_drafts enable row level security;

DROP POLICY IF EXISTS "ai_message_drafts_select_members_or_platform_admin" ON public.ai_message_drafts;
CREATE POLICY "ai_message_drafts_select_members_or_platform_admin" ON public.ai_message_drafts
FOR SELECT USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

DROP POLICY IF EXISTS "ai_message_drafts_update_members_or_platform_admin" ON public.ai_message_drafts;
CREATE POLICY "ai_message_drafts_update_members_or_platform_admin" ON public.ai_message_drafts
FOR UPDATE USING (app_private.is_platform_admin() OR app_private.is_org_member(organization_id))
WITH CHECK (app_private.is_platform_admin() OR app_private.is_org_member(organization_id));

revoke all on public.ai_message_drafts from anon, authenticated;
grant select, update on public.ai_message_drafts to authenticated;
grant execute on function public.generate_ai_reply_draft_for_message(uuid) to authenticated, service_role;

-- Backfill only open inbound conversations that already entered through Stage C, preserving one draft per trigger message.
select public.generate_ai_reply_draft_for_message(m.id)
from public.messages m
join public.conversations c on c.id = m.conversation_id and c.status = 'open'
where m.direction = 'inbound';
