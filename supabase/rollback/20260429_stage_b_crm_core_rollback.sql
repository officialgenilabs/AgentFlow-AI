-- Rollback companion for AgentFlow AI Phase 2 / Stage B CRM Core.
-- Use only before production adoption or after exporting any wanted CRM data.
-- This reverses only Stage B objects and leaves Stage A tenant/auth/audit/branding intact.

begin;

drop trigger if exists lead_tasks_record_event_after_write on public.lead_tasks;
drop trigger if exists lead_tasks_integrity_before_write on public.lead_tasks;
drop trigger if exists lead_notes_record_event_after_insert on public.lead_notes;
drop trigger if exists lead_notes_integrity_before_write on public.lead_notes;
drop trigger if exists leads_record_state_events_after_write on public.leads;
drop trigger if exists leads_integrity_before_write on public.leads;
drop trigger if exists lead_pipeline_stages_touch_updated_at on public.lead_pipeline_stages;
drop trigger if exists organizations_seed_default_lead_pipeline_after_insert on public.organizations;

drop table if exists public.lead_tasks;
drop table if exists public.lead_events;
drop table if exists public.lead_notes;
drop table if exists public.leads;
drop table if exists public.lead_pipeline_stages;

drop function if exists app_private.seed_default_lead_pipeline_for_new_org();
drop function if exists app_private.seed_default_lead_pipeline(uuid);
drop function if exists app_private.record_lead_task_event();
drop function if exists app_private.record_lead_note_event();
drop function if exists app_private.record_lead_state_events();
drop function if exists app_private.record_lead_event(uuid, uuid, text, text, jsonb, jsonb, jsonb);
drop function if exists app_private.assert_lead_task_integrity();
drop function if exists app_private.assert_lead_note_integrity();
drop function if exists app_private.assert_lead_child_integrity();
drop function if exists app_private.assert_lead_stage_and_assignment_integrity();
drop function if exists app_private.is_same_org_member(uuid, uuid);

commit;
