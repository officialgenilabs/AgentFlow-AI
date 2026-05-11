-- Stage F: AI Sales Decision Engine (Closer Upgrade)
-- AI draft generation logic only. No send infrastructure, auto-send, ingestion, or schema changes.

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
  v_history_text text := '';
  v_name text;
  v_body_lower text;
  v_all_text text;
  v_bedroom_match text[];
  v_budget_signal text;
  v_timing_signal text;
  v_location_signal text;
  v_property_type text;
  v_property_signal text;
  v_action text;
  v_question_line text;
  v_action_line text;
  v_ack_line text;
  v_variant int;
  v_draft text;
  v_draft_id uuid;
  v_requires_human_followup boolean := false;
  v_has_area boolean := false;
  v_has_budget boolean := false;
  v_has_bedrooms boolean := false;
  v_has_timing boolean := false;
  v_has_viewing_intent boolean := false;
  v_has_buy_rent boolean := false;
  v_has_objection boolean := false;
  v_has_confusion boolean := false;
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

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id,
      'direction', x.direction,
      'sender_type', x.sender_type,
      'body', x.body,
      'occurred_at', x.occurred_at
    ) order by x.occurred_at asc, x.created_at asc), '[]'::jsonb),
    lower(coalesce(string_agg(x.body, E'\n' order by x.occurred_at asc, x.created_at asc), ''))
  into v_history, v_history_text
  from (
    select m.id, m.direction, m.sender_type, m.body, m.occurred_at, m.created_at
    from public.messages m
    where m.organization_id = v_message.organization_id
      and m.conversation_id = v_message.conversation_id
    order by m.occurred_at desc, m.created_at desc
    limit 8
  ) x;

  v_variant := abs(hashtext(coalesce(v_message.external_message_id, v_message.id::text) || '|' || coalesce(v_message.body, ''))) % 10;
  v_name := nullif(split_part(coalesce(v_lead.full_name, v_message.sender_display_name, ''), ' ', 1), '');
  v_body_lower := lower(coalesce(v_message.body, ''));
  v_all_text := lower(coalesce(v_history_text, '') || E'\n' || coalesce(v_lead.lead_origin_metadata::text, ''));
  v_bedroom_match := regexp_match(coalesce(v_all_text, ''), '([0-9]+|one|two|three|four|five)[ -]?bed(room)?', 'i');

  v_location_signal := case
    when v_all_text like '%sandton%' then 'Sandton'
    when v_all_text like '%rosebank%' then 'Rosebank'
    when v_all_text like '%midrand%' then 'Midrand'
    when v_all_text like '%centurion%' then 'Centurion'
    when v_all_text like '%pretoria%' then 'Pretoria'
    when v_all_text like '%johannesburg%' or v_all_text like '%joburg%' or v_all_text like '%jhb%' then 'Johannesburg'
    when v_all_text like '%cape town%' then 'Cape Town'
    when v_all_text like '%durban%' then 'Durban'
    else null
  end;

  v_budget_signal := case
    when v_all_text like '%not sure%budget%' or v_all_text like '%unsure%budget%' then null
    when v_all_text ~ '(under|below|up to|around|budget|range|between)[[:space:]]*r?[[:space:]]*[0-9]+(\.[0-9]+)?[[:space:]]*[mk]?' then substring(coalesce(v_history_text, v_message.body, '') from '((?:under|below|up to|around|budget|range|between)[[:space:]]*r?[[:space:]]*[0-9]+(?:\.[0-9]+)?[[:space:]]*[mk]?)')
    when v_all_text ~ 'r[[:space:]]*[0-9]' then 'budget noted'
    else null
  end;

  v_timing_signal := case
    when v_all_text like '%tomorrow%' then 'tomorrow'
    when v_all_text like '%today%' then 'today'
    when v_all_text like '%weekend%' then 'this weekend'
    when v_all_text like '%next week%' then 'next week'
    when v_all_text like '%soon%' then 'soon'
    when v_all_text like '%urgent%' or v_all_text like '%asap%' then 'urgent'
    else null
  end;

  v_property_type := case
    when v_all_text like '%apartment%' or v_all_text like '%flat%' then 'apartment'
    when v_all_text like '%house%' or v_all_text like '%home%' then 'home'
    else 'property'
  end;

  v_has_area := v_location_signal is not null;
  v_has_budget := v_budget_signal is not null;
  v_has_bedrooms := v_bedroom_match is not null;
  v_has_timing := v_timing_signal is not null;
  v_has_buy_rent := v_all_text ~ '(buy|purchase|bond|rent|rental)';
  v_has_viewing_intent := v_body_lower ~ '(view|viewing|book|schedule|appointment|see it|come through)' or v_all_text ~ '(viewing|book a viewing|schedule a viewing)';
  v_has_objection := v_body_lower ~ '(expensive|too much|price|deposit|fee|afford|cheaper|over budget|not ready|later|hesitant|concern|worried)';
  v_has_confusion := v_body_lower ~ '(confused|don.t understand|do not understand|what do you mean|lost|unclear|not sure what|speak to someone|call me|agent|human)' or length(btrim(coalesce(v_message.body, ''))) <= 3;

  if v_bedroom_match is not null and v_location_signal is not null then
    v_property_signal := lower(v_bedroom_match[1]) || '-bedroom ' || v_property_type || ' in ' || v_location_signal;
  elsif v_bedroom_match is not null then
    v_property_signal := lower(v_bedroom_match[1]) || '-bedroom ' || v_property_type;
  elsif v_location_signal is not null then
    v_property_signal := case
      when v_property_type = 'apartment' then 'apartments in ' || v_location_signal
      when v_property_type = 'home' then 'homes in ' || v_location_signal
      else 'options in ' || v_location_signal
    end;
  elsif v_has_viewing_intent then
    v_property_signal := 'the viewing';
  else
    v_property_signal := 'the right options';
  end if;

  v_action := case
    when v_has_confusion then 'ESCALATE'
    when v_has_objection then 'HANDLE_OBJECTION'
    when v_has_viewing_intent or (v_has_area and v_has_budget and (v_has_bedrooms or v_has_buy_rent or v_has_timing)) then 'CLOSE'
    else 'ADVANCE'
  end;

  if v_action = 'ESCALATE' then
    v_requires_human_followup := true;
    v_draft := 'I’m going to have one of our agents reach out to you directly to get this sorted quickly 👍';
  else
    v_ack_line := case
      when v_action = 'HANDLE_OBJECTION' and v_body_lower ~ '(expensive|too much|price|over budget|cheaper|afford)' then 'I hear you — price needs to make sense, not just look good on paper.'
      when v_action = 'HANDLE_OBJECTION' then 'No stress — we can make this easier.'
      when v_action = 'CLOSE' and v_has_viewing_intent then 'Perfect — let’s move this to a viewing.'
      when v_action = 'CLOSE' and v_has_area and v_has_budget then 'Perfect — I’ve got enough to move this forward.'
      when v_has_area or v_has_budget or v_has_bedrooms then 'Got it — that gives me a clear direction.'
      else 'Got you — we can narrow this down fast.'
    end;

    v_question_line := case
      when v_action = 'HANDLE_OBJECTION' and not v_has_budget then 'What monthly range would feel comfortable?'
      when v_action = 'HANDLE_OBJECTION' and v_has_budget then null
      when v_action = 'CLOSE' and v_has_viewing_intent and not v_has_timing then 'What time works best for you?'
      when v_action = 'CLOSE' then null
      when v_action = 'ADVANCE' and not v_has_area then 'Which area should I focus on first?'
      when v_action = 'ADVANCE' and not v_has_buy_rent then 'Are you buying or renting?'
      when v_action = 'ADVANCE' and not v_has_budget then 'What budget range should I keep it within?'
      when v_action = 'ADVANCE' and not v_has_bedrooms then 'How many bedrooms do you need?'
      else null
    end;

    v_action_line := case
      when v_action = 'HANDLE_OBJECTION' and v_has_budget then 'I’ll line up options right after and keep it tight to what actually fits 👍'
      when v_action = 'HANDLE_OBJECTION' then 'We can set this up quickly once I know the range 👍'
      when v_action = 'CLOSE' and v_has_viewing_intent and v_has_timing then 'Let’s lock this in — I can get this booked today 👍'
      when v_action = 'CLOSE' and v_has_viewing_intent then 'I can get this booked today once you send the time 👍'
      when v_action = 'CLOSE' then 'I’ll line up options right after — let’s lock this in 👍'
      when v_question_line is not null then 'I’ll line up options right after.'
      else 'We can set this up quickly 👍'
    end;

    v_draft := case v_variant % 5
      when 0 then format('Hi%s 👋%s%s%s%s%s', coalesce(' ' || v_name, ''), E'\n\n', v_ack_line, case when v_question_line is not null then E'\n\n' || v_question_line else '' end, E'\n\n' || v_action_line, '')
      when 1 then format('%s%s%s%s%s', v_ack_line, case when v_question_line is not null then E'\n\nQuick one: ' || v_question_line else '' end, E'\n\n' || v_action_line, case when v_action = 'CLOSE' then ' ✨' else '' end, '')
      when 2 then format('Hi%s%s%s%s%s', coalesce(' ' || v_name, ''), E'\n\n' || v_ack_line, case when v_question_line is not null then E'\n' || v_question_line else '' end, E'\n\n' || v_action_line, '')
      when 3 then format('%s%s%s%s', v_ack_line, case when v_question_line is not null then E'\n\n' || v_question_line else '' end, E'\n\n' || v_action_line, '')
      else format('Hi%s — %s%s%s%s', coalesce(' ' || v_name, ''), v_ack_line, case when v_question_line is not null then E'\n\n' || v_question_line else '' end, E'\n\n' || v_action_line, '')
    end;
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
    'agentflow_sales_decision_engine_v1',
    jsonb_build_object(
      'doctrine', 'stage_f_sales_decision_engine_no_behavior_change',
      'rules', jsonb_build_array('draft_only', 'human_approval_required', 'decision_classification', 'max_1_question', 'no_repeated_qualification', 'prioritize_booking_or_shortlist', 'no_outbound_transport', 'no_auto_send'),
      'decision_action', v_action,
      'requires_human_followup', v_requires_human_followup,
      'conversation_status', v_conversation.status,
      'last_message', v_message.body,
      'signals', jsonb_build_object(
        'has_area', v_has_area,
        'has_budget', v_has_budget,
        'has_bedrooms', v_has_bedrooms,
        'has_timing', v_has_timing,
        'has_viewing_intent', v_has_viewing_intent,
        'has_buy_rent', v_has_buy_rent,
        'has_objection', v_has_objection,
        'has_confusion', v_has_confusion,
        'location', v_location_signal,
        'budget', v_budget_signal,
        'timing', v_timing_signal,
        'property_signal', v_property_signal
      ),
      'question_selected', v_question_line,
      'closing_line', v_action_line,
      'variation_key', v_variant,
      'lead', jsonb_build_object('id', v_lead.id, 'full_name', v_lead.full_name, 'phone', v_lead.phone, 'email', v_lead.email, 'identity_confidence', v_lead.identity_confidence),
      'history_last_8', v_history
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
'Creates/refreshes Stage F sales decision engine WhatsApp drafts for inbound messages in open conversations. Draft-only: no send infrastructure, no automatic sends, no ingestion changes.';

grant execute on function public.generate_ai_reply_draft_for_message(uuid) to authenticated, service_role;
