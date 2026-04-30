-- Rollback companion for AgentFlow AI Phase 2.5 — Lead Identity & Intake Bridge.
-- Safe dry-run pattern: begin; \i this_file.sql; rollback;
-- This removes only Phase 2.5 identity/intake additions and restores the Stage B lead integrity trigger function.

drop function if exists public.ingest_lead_from_intake(uuid, text, text, text, text, timestamptz, text, text, text, text, jsonb, text, text, numeric);
drop function if exists app_private.find_lead_identity_match(uuid, text, text);

create or replace function app_private.assert_lead_stage_and_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

drop index if exists public.leads_org_identity_confidence_idx;
drop index if exists public.leads_org_normalized_email_unique_idx;
drop index if exists public.leads_org_normalized_phone_unique_idx;

alter table public.leads drop constraint if exists leads_identity_confidence_check;
alter table public.leads drop constraint if exists leads_normalized_phone_e164_check;
alter table public.leads drop constraint if exists leads_normalized_email_check;

alter table public.leads drop column if exists identity_confidence;
alter table public.leads drop column if exists normalized_phone_e164;
alter table public.leads drop column if exists normalized_email;

drop function if exists app_private.normalize_phone_e164(text);
drop function if exists app_private.normalize_lead_email(text);
