-- Stage D.2: Human-Like WhatsApp Messaging Upgrade
-- Output strategy only. No schema, trigger, outbound, or auto-send changes.

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
  v_bedroom_match text[];
  v_budget_signal text;
  v_timing_signal text;
  v_location_signal text;
  v_property_type text;
  v_property_signal text;
  v_question_line text;
  v_action_line text;
  v_interrupt text;
  v_draft text;
  v_draft_id uuid;
begin
  select * into v_message from public.messages m where m.id = p_message_id;

  if v_message.id is null then
    raise exception 'message_not_found';
  end if;

  if v_message.direction <> 'inbound' then
    return null;
  end if;

  select * into v_conversation from public.conversations c where c.id = v_message.conversation_id;

  if v_conversation.id is null or v_conversation.status <> 'open' then
    return null;
  end if;

  select * into v_lead from public.leads l where l.id = coalesce(v_message.lead_id, v_conversation.lead_id);

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
  v_bedroom_match := regexp_match(coalesce(v_message.body, ''), '([0-9]+|one|two|three|four|five)[ -]?bed(room)?', 'i');

  v_location_signal := case
    when v_body_lower like '%sandton%' then 'Sandton'
    when v_body_lower like '%rosebank%' then 'Rosebank'
    when v_body_lower like '%midrand%' then 'Midrand'
    when v_body_lower like '%centurion%' then 'Centurion'
    when v_body_lower like '%pretoria%' then 'Pretoria'
    when v_body_lower like '%johannesburg%' or v_body_lower like '%joburg%' then 'Johannesburg'
    else null
  end;

  v_budget_signal := case
    when v_body_lower ~ '(under|below|up to|around)\s*r?\s*[0-9]+\s*k?' then 'budget ' || substring(coalesce(v_message.body, '') from '((?:under|below|up to|around)\s*R?\s*[0-9]+\s*k?)')
    when v_body_lower like '%budget%' or v_body_lower ~ 'r[0-9]' then 'your budget'
    else null
  end;

  v_timing_signal := case
    when v_body_lower like '%tomorrow%' then 'tomorrow'
    when v_body_lower like '%today%' then 'today'
    when v_body_lower like '%weekend%' then 'this weekend'
    when v_body_lower like '%soon%' then 'soon'
    else null
  end;

  v_property_type := case
    when v_body_lower like '%apartment%' or v_body_lower like '%flat%' then 'apartment'
    when v_body_lower like '%house%' then 'home'
    else 'home'
  end;

  if v_bedroom_match is not null and v_location_signal is not null then
    v_property_signal := 'a ' || lower(v_bedroom_match[1]) || '-bedroom ' || v_property_type || ' in ' || v_location_signal;
  elsif v_bedroom_match is not null then
    v_property_signal := 'a ' || lower(v_bedroom_match[1]) || '-bedroom ' || v_property_type;
  elsif v_location_signal is not null then
    v_property_signal := case when v_property_type = 'apartment' then 'an apartment in ' || v_location_signal when v_body_lower like '%house%' then 'a home in ' || v_location_signal else 'property options in ' || v_location_signal end;
  elsif v_body_lower like '%viewing%' or v_body_lower like '%view%' then
    v_property_signal := 'a viewing';
  elsif v_body_lower like '%house%' or v_body_lower like '%property%' or v_body_lower like '%apartment%' or v_body_lower like '%flat%' then
    v_property_signal := 'a property search';
  else
    v_property_signal := 'this';
  end if;

  v_interrupt := case
    when v_body_lower like '%viewing%' or v_body_lower like '%view%' then 'Let’s lock this in:'
    when v_budget_signal is not null or v_timing_signal is not null then 'Just so I get this right:'
    when v_location_signal is not null or v_bedroom_match is not null then 'Quick one:'
    else 'Easy to sort:'
  end;

  v_question_line := case
    when v_budget_signal is not null and v_timing_signal is not null then 'Any must-have features I should filter for?'
    when v_budget_signal is not null then 'When would you like to view?'
    when v_timing_signal is not null then 'What budget range should I work with?'
    when v_body_lower like '%viewing%' or v_body_lower like '%view%' then 'What budget range should I work with?'
    else 'What budget range should I work with?'
  end;

  v_action_line := case
    when v_body_lower like '%viewing%' or v_body_lower like '%view%' then 'I can book a viewing from there 👍'
    when v_location_signal is not null or v_bedroom_match is not null then 'I can line up matching options right after 👍'
    else 'I can move this to the next step right after 👍'
  end;

  if v_property_signal = 'this' then
    v_draft := format(
      'Hi%s 👋%s%s%s%s%s%s%s',
      case when v_name is not null then ' ' || v_name else '' end,
      E'\n\n',
      v_interrupt,
      E'\n',
      v_question_line,
      E'\n\n',
      v_action_line,
      ''
    );
  else
    v_draft := format(
      'Hi%s 👋%sGot it — %s%s.%s%s%s%s%s',
      case when v_name is not null then ' ' || v_name else '' end,
      E'\n\n',
      v_property_signal,
      case when v_budget_signal is not null then ' with ' || v_budget_signal else '' end,
      E'\n\n',
      v_interrupt,
      E'\n',
      v_question_line,
      E'\n\n' || v_action_line
    );
  end if;

  insert into public.ai_message_drafts (
    organization_id, conversation_id, message_id, lead_id,
    draft_content, status, generation_model, generation_context
  ) values (
    v_message.organization_id,
    v_message.conversation_id,
    v_message.id,
    coalesce(v_message.lead_id, v_conversation.lead_id),
    v_draft,
    'draft',
    'agentflow_whatsapp_sales_draft_v1',
    jsonb_build_object(
      'doctrine', 'stage_d2_human_whatsapp_no_auto_send',
      'rules', jsonb_build_array('draft_only', 'human_approval_required', 'max_1_question', 'one_pattern_interrupt', 'max_2_functional_emojis', 'no_outbound_transport', 'no_auto_send'),
      'conversation_status', v_conversation.status,
      'last_message', v_message.body,
      'extracted_signal', v_property_signal,
      'pattern_interrupt', v_interrupt,
      'lead', jsonb_build_object('id', v_lead.id, 'full_name', v_lead.full_name, 'phone', v_lead.phone, 'email', v_lead.email, 'identity_confidence', v_lead.identity_confidence),
      'history_last_5', v_history
    )
  )
  on conflict (message_id) do update
  set draft_content = case when public.ai_message_drafts.status = 'draft' then excluded.draft_content else public.ai_message_drafts.draft_content end,
      generation_context = case when public.ai_message_drafts.status = 'draft' then excluded.generation_context else public.ai_message_drafts.generation_context end,
      generation_model = case when public.ai_message_drafts.status = 'draft' then excluded.generation_model else public.ai_message_drafts.generation_model end,
      updated_at = case when public.ai_message_drafts.status = 'draft' then now() else public.ai_message_drafts.updated_at end
  returning id into v_draft_id;

  return v_draft_id;
end;
$$;

comment on function public.generate_ai_reply_draft_for_message(uuid) is
'Creates/refreshes human-like WhatsApp sales drafts for inbound messages in open conversations. Draft-only: no outbound transport and no automatic sends.';

grant execute on function public.generate_ai_reply_draft_for_message(uuid) to authenticated, service_role;
