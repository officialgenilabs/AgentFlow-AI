-- Phase 11A fail-closed routing validation
-- Rollback-only validation. Creates temporary transactional records and rolls them back.

begin;

do $$
declare
  v_org uuid;
  v_user uuid;
  v_channel uuid;
  v_disabled_channel uuid;
  v_missing_owner_channel uuid;
  v_ambiguous_channel_a uuid;
  v_ambiguous_channel_b uuid;
  v_result record;
  v_result_2 record;
  v_message_count integer;
  v_rejection_count_before integer;
  v_rejection_count_after integer;
  v_blocked boolean := false;
begin
  select om.organization_id, om.user_id
  into v_org, v_user
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  join public.profiles p on p.id = om.user_id
  where om.status = 'active'
  order by o.created_at asc
  limit 1;

  if v_org is null or v_user is null then
    raise exception 'validation_requires_active_org_member';
  end if;

  select count(*) into v_rejection_count_before from public.inbound_routing_rejections;

  insert into public.channels (
    organization_id,
    provider,
    channel_type,
    display_name,
    external_channel_id,
    status,
    owner_user_id,
    default_assignee_user_id,
    visibility_scope,
    fail_closed_policy,
    metadata
  ) values (
    v_org,
    'evolution',
    'whatsapp',
    'Phase 11A Validation Channel',
    'Phase11A_Validation_Primary',
    'active',
    v_user,
    v_user,
    'agent_owned',
    'quarantine',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) returning id into v_channel;

  select * into v_result
  from public.ingest_evolution_inbound_message(
    'Phase11A_Validation_Primary',
    'phase11a-validation-thread',
    'phase11a-validation-message-1',
    'Phase 11A validation inbound message',
    now(),
    'Phase 11A Validation Lead',
    '+27000000000',
    null,
    'phase11a-validation-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  if v_result.routing_status <> 'accepted'
     or v_result.organization_id <> v_org
     or v_result.channel_id <> v_channel
     or v_result.default_assignee_user_id <> v_user
     or v_result.conversation_id is null
     or v_result.message_id is null
     or v_result.lead_id is null then
    raise exception 'known_mapped_instance_validation_failed: %', row_to_json(v_result);
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = v_result.conversation_id
      and c.assigned_owner_user_id = v_user
  ) then
    raise exception 'conversation_owner_propagation_failed';
  end if;

  if not exists (
    select 1 from public.leads l
    where l.id = v_result.lead_id
      and l.assigned_owner_user_id = v_user
  ) then
    raise exception 'lead_owner_propagation_failed';
  end if;

  select * into v_result_2
  from public.ingest_evolution_inbound_message(
    'Phase11A_Validation_Primary',
    'phase11a-validation-thread',
    'phase11a-validation-message-1',
    'Phase 11A validation inbound message',
    now(),
    'Phase 11A Validation Lead',
    '+27000000000',
    null,
    'phase11a-validation-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run-duplicate',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  select count(*) into v_message_count
  from public.messages
  where channel_id = v_channel
    and external_message_id = 'phase11a-validation-message-1';

  if v_result_2.routing_status <> 'accepted' or v_message_count <> 1 then
    raise exception 'duplicate_message_dedupe_validation_failed status=% count=%', v_result_2.routing_status, v_message_count;
  end if;

  select * into v_result
  from public.ingest_evolution_inbound_message(
    'Phase11A_Unknown_Primary',
    'unknown-thread',
    'unknown-message',
    'Should quarantine',
    now(),
    'Unknown Sender',
    '+27000000001',
    null,
    'unknown-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run-unknown',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  if v_result.routing_status <> 'quarantined' or v_result.rejection_reason <> 'unknown_evolution_instance' or v_result.rejection_id is null then
    raise exception 'unknown_instance_quarantine_validation_failed: %', row_to_json(v_result);
  end if;

  insert into public.channels (
    organization_id,
    provider,
    channel_type,
    display_name,
    external_channel_id,
    status,
    owner_user_id,
    default_assignee_user_id,
    visibility_scope,
    fail_closed_policy,
    metadata
  ) values (
    v_org,
    'evolution',
    'whatsapp',
    'Phase 11A Disabled Validation Channel',
    'Phase11A_Disabled_Primary',
    'disabled',
    v_user,
    v_user,
    'agent_owned',
    'quarantine',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) returning id into v_disabled_channel;

  select * into v_result
  from public.ingest_evolution_inbound_message(
    'Phase11A_Disabled_Primary',
    'disabled-thread',
    'disabled-message',
    'Should reject disabled',
    now(),
    'Disabled Sender',
    '+27000000002',
    null,
    'disabled-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run-disabled',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  if v_result.routing_status <> 'rejected' or v_result.rejection_reason <> 'channel_not_active' or v_result.channel_id <> v_disabled_channel then
    raise exception 'disabled_instance_reject_validation_failed: %', row_to_json(v_result);
  end if;

  insert into public.channels (
    organization_id,
    provider,
    channel_type,
    display_name,
    external_channel_id,
    status,
    owner_user_id,
    default_assignee_user_id,
    visibility_scope,
    fail_closed_policy,
    metadata
  ) values (
    v_org,
    'evolution',
    'whatsapp',
    'Phase 11A Missing Owner Validation Channel',
    'Phase11A_MissingOwner_Primary',
    'active',
    null,
    null,
    'agency_shared',
    'quarantine',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) returning id into v_missing_owner_channel;

  select * into v_result
  from public.ingest_evolution_inbound_message(
    'Phase11A_MissingOwner_Primary',
    'missing-owner-thread',
    'missing-owner-message',
    'Should quarantine missing owner',
    now(),
    'Missing Owner Sender',
    '+27000000003',
    null,
    'missing-owner-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run-missing-owner',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  if v_result.routing_status <> 'quarantined' or v_result.rejection_reason <> 'channel_owner_missing' or v_result.channel_id <> v_missing_owner_channel then
    raise exception 'missing_owner_quarantine_validation_failed: %', row_to_json(v_result);
  end if;

  insert into public.channels (
    organization_id,
    provider,
    channel_type,
    display_name,
    external_channel_id,
    status,
    owner_user_id,
    default_assignee_user_id,
    visibility_scope,
    fail_closed_policy,
    metadata
  ) values (
    v_org,
    'evolution',
    'whatsapp',
    'Phase 11A Ambiguous Validation Channel A',
    'Phase11A_Ambiguous_Primary',
    'active',
    v_user,
    v_user,
    'agent_owned',
    'quarantine',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) returning id into v_ambiguous_channel_a;

  insert into public.channels (
    organization_id,
    provider,
    channel_type,
    display_name,
    external_channel_id,
    status,
    owner_user_id,
    default_assignee_user_id,
    visibility_scope,
    fail_closed_policy,
    metadata
  ) values (
    v_org,
    'evolution',
    'whatsapp',
    'Phase 11A Ambiguous Validation Channel B',
    'phase11a_ambiguous_primary',
    'active',
    v_user,
    v_user,
    'agent_owned',
    'quarantine',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) returning id into v_ambiguous_channel_b;

  select * into v_result
  from public.ingest_evolution_inbound_message(
    'PHASE11A_AMBIGUOUS_PRIMARY',
    'ambiguous-thread',
    'ambiguous-message',
    'Should reject ambiguous mapping',
    now(),
    'Ambiguous Sender',
    '+27000000006',
    null,
    'ambiguous-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run-ambiguous',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  if v_result.routing_status <> 'rejected' or v_result.rejection_reason <> 'ambiguous_channel_mapping' then
    raise exception 'ambiguous_mapping_reject_validation_failed: %', row_to_json(v_result);
  end if;

  update public.organization_members
  set status = 'disabled'
  where organization_id = v_org
    and user_id = v_user;

  select * into v_result
  from public.ingest_evolution_inbound_message(
    'Phase11A_Validation_Primary',
    'inactive-owner-thread',
    'inactive-owner-message',
    'Should quarantine inactive owner',
    now(),
    'Inactive Owner Sender',
    '+27000000004',
    null,
    'inactive-owner-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run-inactive-owner',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  if v_result.routing_status <> 'quarantined' or v_result.rejection_reason <> 'channel_owner_inactive_or_cross_tenant' then
    raise exception 'inactive_owner_quarantine_validation_failed: %', row_to_json(v_result);
  end if;

  update public.organization_members
  set status = 'active'
  where organization_id = v_org
    and user_id = v_user;

  begin
    insert into public.channels (
      organization_id,
      provider,
      channel_type,
      display_name,
      external_channel_id,
      status,
      owner_user_id,
      default_assignee_user_id,
      visibility_scope,
      fail_closed_policy,
      metadata
    ) values (
      v_org,
      'evolution',
      'whatsapp',
      'Unsafe AgentFlow Primary Validation Channel',
      'agentflow_primary',
      'active',
      v_user,
      v_user,
      'agent_owned',
      'quarantine',
      jsonb_build_object('validation_scope', 'phase11a_rollback_only')
    );
  exception when others then
    if sqlerrm like '%agentflow_primary_reserved_for_internal_operations%' then
      v_blocked := true;
    else
      raise;
    end if;
  end;

  if not v_blocked then
    raise exception 'agentflow_primary_non_internal_insert_was_not_blocked_case_insensitive';
  end if;

  select * into v_result
  from public.ingest_evolution_inbound_message(
    'bad instance; drop table channels;',
    'malformed-thread',
    'malformed-message',
    'Should reject malformed',
    now(),
    'Malformed Sender',
    '+27000000005',
    null,
    'malformed-sender',
    'messages.upsert',
    'conversation',
    false,
    'phase11a-validation-run-malformed',
    jsonb_build_object('validation_scope', 'phase11a_rollback_only')
  ) limit 1;

  if v_result.routing_status <> 'rejected' or v_result.rejection_reason <> 'evolution_instance_malformed' then
    raise exception 'malformed_instance_reject_validation_failed: %', row_to_json(v_result);
  end if;

  select count(*) into v_rejection_count_after from public.inbound_routing_rejections;
  if v_rejection_count_after <= v_rejection_count_before then
    raise exception 'routing_rejection_evidence_not_written';
  end if;

  raise notice 'phase11a_fail_closed_routing_validation_passed';
end $$;

rollback;
