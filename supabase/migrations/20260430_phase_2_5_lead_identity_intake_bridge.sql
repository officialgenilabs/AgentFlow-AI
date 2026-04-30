-- AgentFlow AI Phase 2.5 — Lead Identity & Intake Bridge
-- Additive / rollback-safe CRM integrity layer. No inbox/conversation surface area.
-- Doctrine:
--   1. Organization scope is always part of identity.
--   2. Strong phone identity is normalized E.164 and wins over email.
--   3. Strong email identity is lowercase normalized email.
--   4. Blank or weak identity never matches an existing lead.
--   5. Phone/email matching different leads is an identity conflict, not an auto-merge.

create schema if not exists app_private;
revoke all on schema app_private from public;

create or replace function app_private.normalize_lead_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when nullif(lower(btrim(coalesce(p_email, ''))), '') is null then null
    when lower(btrim(p_email)) ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
      then lower(btrim(p_email))
    else null
  end;
$$;

create or replace function app_private.normalize_phone_e164(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := btrim(coalesce(p_phone, ''));
  digits text;
begin
  if raw = '' then
    return null;
  end if;

  -- Already international: keep only digits after the leading +, then validate E.164 length/shape.
  if raw ~ '^\s*\+' then
    digits := regexp_replace(raw, '\D', '', 'g');
    if digits ~ '^[1-9][0-9]{7,14}$' then
      return '+' || digits;
    end if;
    return null;
  end if;

  digits := regexp_replace(raw, '\D', '', 'g');
  if digits = '' then
    return null;
  end if;

  -- International prefix form, e.g. 0027...
  if left(digits, 2) = '00' then
    digits := substr(digits, 3);
    if digits ~ '^[1-9][0-9]{7,14}$' then
      return '+' || digits;
    end if;
    return null;
  end if;

  -- South African default path for local CRM capture: 0821234567 -> +27821234567.
  if left(digits, 1) = '0' and length(digits) = 10 then
    digits := '27' || substr(digits, 2);
    if digits ~ '^[1-9][0-9]{7,14}$' then
      return '+' || digits;
    end if;
    return null;
  end if;

  -- South African country-code form without plus: 27821234567 -> +27821234567.
  if left(digits, 2) = '27' and length(digits) = 11 then
    return '+' || digits;
  end if;

  -- Ambiguous national numbers are intentionally weak: store raw if needed, but do not match.
  return null;
end;
$$;

alter table public.leads add column if not exists normalized_email text;
alter table public.leads add column if not exists normalized_phone_e164 text;
alter table public.leads add column if not exists identity_confidence text not null default 'none';

alter table public.leads drop constraint if exists leads_normalized_email_check;
alter table public.leads add constraint leads_normalized_email_check check (
  normalized_email is null or normalized_email = lower(btrim(normalized_email))
);

alter table public.leads drop constraint if exists leads_normalized_phone_e164_check;
alter table public.leads add constraint leads_normalized_phone_e164_check check (
  normalized_phone_e164 is null or normalized_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
);

alter table public.leads drop constraint if exists leads_identity_confidence_check;
alter table public.leads add constraint leads_identity_confidence_check check (
  identity_confidence in ('none', 'email', 'phone', 'phone_email')
);

comment on column public.leads.normalized_email is 'Lowercase strong email identity. Null means blank/malformed/weak and must not be used for matching.';
comment on column public.leads.normalized_phone_e164 is 'Strong phone identity in E.164. Null means blank/ambiguous/weak and must not be used for matching.';
comment on column public.leads.identity_confidence is 'Deterministic identity confidence derived from normalized_phone_e164 and normalized_email.';

create or replace function app_private.assert_lead_stage_and_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  new.full_name = btrim(new.full_name);
  new.email = nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.phone = nullif(btrim(coalesce(new.phone, '')), '');
  new.exact_source = nullif(btrim(new.exact_source), '');
  new.source_subtype = nullif(btrim(new.source_subtype), '');
  new.original_inbound_channel = nullif(btrim(new.original_inbound_channel), '');
  new.source_reference = nullif(btrim(coalesce(new.source_reference, '')), '');
  new.captured_at = coalesce(new.captured_at, now());

  if new.full_name is null or length(new.full_name) = 0 then
    raise exception 'lead_full_name_required';
  end if;

  if new.exact_source is null or new.source_subtype is null or new.original_inbound_channel is null then
    raise exception 'lead_source_integrity_required';
  end if;

  new.normalized_email = app_private.normalize_lead_email(new.email);
  new.normalized_phone_e164 = app_private.normalize_phone_e164(new.phone);

  if new.normalized_phone_e164 is not null and new.normalized_email is not null then
    new.identity_confidence = 'phone_email';
  elsif new.normalized_phone_e164 is not null then
    new.identity_confidence = 'phone';
  elsif new.normalized_email is not null then
    new.identity_confidence = 'email';
  else
    new.identity_confidence = 'none';
  end if;

  if new.pipeline_stage_id is not null and not exists (
    select 1 from public.lead_pipeline_stages s
    where s.id = new.pipeline_stage_id
      and s.organization_id = new.organization_id
  ) then
    raise exception 'pipeline_stage_must_belong_to_lead_organization';
  end if;

  if new.assigned_owner_user_id is not null and not app_private.is_same_org_member(new.organization_id, new.assigned_owner_user_id) then
    raise exception 'assigned_owner_must_belong_to_same_organization';
  end if;

  new.updated_at = now();
  new.updated_by_user_id = coalesce(auth.uid(), new.updated_by_user_id);
  return new;
end;
$$;

update public.leads
set
  email = nullif(lower(btrim(coalesce(email, ''))), ''),
  phone = nullif(btrim(coalesce(phone, '')), ''),
  normalized_email = app_private.normalize_lead_email(email),
  normalized_phone_e164 = app_private.normalize_phone_e164(phone),
  identity_confidence = case
    when app_private.normalize_phone_e164(phone) is not null and app_private.normalize_lead_email(email) is not null then 'phone_email'
    when app_private.normalize_phone_e164(phone) is not null then 'phone'
    when app_private.normalize_lead_email(email) is not null then 'email'
    else 'none'
  end;

create unique index if not exists leads_org_normalized_phone_unique_idx
on public.leads (organization_id, normalized_phone_e164)
where normalized_phone_e164 is not null;

create unique index if not exists leads_org_normalized_email_unique_idx
on public.leads (organization_id, normalized_email)
where normalized_email is not null;

create index if not exists leads_org_identity_confidence_idx
on public.leads (organization_id, identity_confidence, created_at desc);

create or replace function app_private.find_lead_identity_match(
  p_organization_id uuid,
  p_email text default null,
  p_phone text default null
)
returns table (
  lead_id uuid,
  match_rule text,
  identity_confidence text,
  normalized_email text,
  normalized_phone_e164 text
)
language plpgsql
stable
security definer
set search_path = public, app_private
as $$
declare
  v_email text := app_private.normalize_lead_email(p_email);
  v_phone text := app_private.normalize_phone_e164(p_phone);
  v_phone_lead_id uuid;
  v_email_lead_id uuid;
begin
  -- Blank/weak identity fields are not identity. They return no match by design.
  if v_phone is null and v_email is null then
    return;
  end if;

  if v_phone is not null then
    select l.id into v_phone_lead_id
    from public.leads l
    where l.organization_id = p_organization_id
      and l.normalized_phone_e164 = v_phone
    limit 1;
  end if;

  if v_email is not null then
    select l.id into v_email_lead_id
    from public.leads l
    where l.organization_id = p_organization_id
      and l.normalized_email = v_email
    limit 1;
  end if;

  if v_phone_lead_id is not null and v_email_lead_id is not null and v_phone_lead_id <> v_email_lead_id then
    raise exception 'identity_conflict_phone_email_match_different_leads';
  end if;

  if v_phone_lead_id is not null then
    lead_id := v_phone_lead_id;
    match_rule := 'normalized_phone_e164';
    identity_confidence := case when v_email is not null then 'phone_email' else 'phone' end;
    normalized_email := v_email;
    normalized_phone_e164 := v_phone;
    return next;
    return;
  end if;

  if v_email_lead_id is not null then
    lead_id := v_email_lead_id;
    match_rule := 'normalized_email';
    identity_confidence := 'email';
    normalized_email := v_email;
    normalized_phone_e164 := v_phone;
    return next;
    return;
  end if;
end;
$$;

comment on function app_private.find_lead_identity_match(uuid, text, text) is
'Deterministic lead matching: organization-scoped, strong E.164 phone first, lowercase email second, blank/weak fields never match, phone/email conflicts raise.';

create or replace function public.ingest_lead_from_intake(
  p_organization_id uuid,
  p_full_name text,
  p_exact_source text,
  p_source_subtype text,
  p_original_inbound_channel text,
  p_captured_at timestamptz,
  p_email text default null,
  p_phone text default null,
  p_company text default null,
  p_source_reference text default null,
  p_lead_origin_metadata jsonb default '{}'::jsonb,
  p_status text default 'new',
  p_priority text default 'medium',
  p_estimated_value numeric default null
)
returns table (
  lead_id uuid,
  intake_action text,
  match_rule text,
  identity_confidence text
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_match record;
  v_lead_id uuid;
  v_metadata jsonb := coalesce(p_lead_origin_metadata, '{}'::jsonb);
begin
  if not (auth.role() = 'service_role' or app_private.is_platform_admin() or app_private.is_org_member(p_organization_id)) then
    raise exception 'not_authorized_for_organization';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'lead_origin_metadata_must_be_object';
  end if;

  if nullif(btrim(coalesce(p_full_name, '')), '') is null
    or nullif(btrim(coalesce(p_exact_source, '')), '') is null
    or nullif(btrim(coalesce(p_source_subtype, '')), '') is null
    or nullif(btrim(coalesce(p_original_inbound_channel, '')), '') is null
    or p_captured_at is null then
    raise exception 'canonical_intake_required_fields_missing';
  end if;

  select * into v_match
  from app_private.find_lead_identity_match(p_organization_id, p_email, p_phone)
  limit 1;

  if v_match.lead_id is not null then
    perform app_private.record_lead_event(
      p_organization_id,
      v_match.lead_id,
      'lead.intake_matched',
      'lead_identity',
      null,
      jsonb_build_object(
        'exact_source', btrim(p_exact_source),
        'source_subtype', btrim(p_source_subtype),
        'original_inbound_channel', btrim(p_original_inbound_channel),
        'captured_at', p_captured_at,
        'source_reference', nullif(btrim(coalesce(p_source_reference, '')), ''),
        'match_rule', v_match.match_rule,
        'identity_confidence', v_match.identity_confidence
      ),
      jsonb_build_object('doctrine', 'lead_identity_intake_bridge', 'metadata', v_metadata)
    );

    lead_id := v_match.lead_id;
    intake_action := 'matched_existing';
    match_rule := v_match.match_rule;
    identity_confidence := v_match.identity_confidence;
    return next;
    return;
  end if;

  begin
    insert into public.leads (
      organization_id,
      full_name,
      email,
      phone,
      company,
      status,
      priority,
      estimated_value,
      exact_source,
      source_subtype,
      original_inbound_channel,
      source_reference,
      captured_at,
      lead_origin_metadata,
      created_by_user_id,
      updated_by_user_id
    )
    values (
      p_organization_id,
      btrim(p_full_name),
      p_email,
      p_phone,
      nullif(btrim(coalesce(p_company, '')), ''),
      case when p_status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived') then p_status else 'new' end,
      case when p_priority in ('low', 'medium', 'high', 'urgent') then p_priority else 'medium' end,
      p_estimated_value,
      btrim(p_exact_source),
      btrim(p_source_subtype),
      btrim(p_original_inbound_channel),
      nullif(btrim(coalesce(p_source_reference, '')), ''),
      p_captured_at,
      v_metadata || jsonb_build_object('ingestion_shape', 'canonical_lead_intake_v1', 'ingested_by', 'ingest_lead_from_intake'),
      auth.uid(),
      auth.uid()
    )
    returning id into v_lead_id;
  exception when unique_violation then
    -- Race-safe idempotency: another ingestion path inserted the same strong identity first.
    select * into v_match
    from app_private.find_lead_identity_match(p_organization_id, p_email, p_phone)
    limit 1;

    if v_match.lead_id is null then
      raise;
    end if;

    lead_id := v_match.lead_id;
    intake_action := 'matched_existing_after_unique_conflict';
    match_rule := v_match.match_rule;
    identity_confidence := v_match.identity_confidence;
    return next;
    return;
  end;

  lead_id := v_lead_id;
  intake_action := 'created';
  match_rule := null;
  identity_confidence := case
    when app_private.normalize_phone_e164(p_phone) is not null and app_private.normalize_lead_email(p_email) is not null then 'phone_email'
    when app_private.normalize_phone_e164(p_phone) is not null then 'phone'
    when app_private.normalize_lead_email(p_email) is not null then 'email'
    else 'none'
  end;
  return next;
end;
$$;

comment on function public.ingest_lead_from_intake(uuid, text, text, text, text, timestamptz, text, text, text, text, jsonb, text, text, numeric) is
'Canonical ingestion shape v1 for all external lead intake: organization_id, full_name, exact_source, source_subtype, original_inbound_channel, captured_at, optional identity/contact/source reference/metadata. Uses deterministic org-scoped strong identity matching and creates or returns a lead id without inbox/conversation coupling.';

revoke all on function public.ingest_lead_from_intake(uuid, text, text, text, text, timestamptz, text, text, text, text, jsonb, text, text, numeric) from public;
grant execute on function public.ingest_lead_from_intake(uuid, text, text, text, text, timestamptz, text, text, text, text, jsonb, text, text, numeric) to authenticated, service_role;

grant execute on function app_private.normalize_lead_email(text) to authenticated, service_role;
grant execute on function app_private.normalize_phone_e164(text) to authenticated, service_role;
grant execute on function app_private.find_lead_identity_match(uuid, text, text) to authenticated, service_role;
