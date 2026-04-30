-- Rollback: AgentFlow AI Phase 3 / Stage C — Conversations + Inbox
-- Drops only Stage C objects. Earlier CRM/intake layers remain intact.

drop function if exists public.ingest_inbound_message(uuid, text, text, text, timestamptz, text, text, text, text, jsonb);

drop trigger if exists assert_automation_event_integrity on public.automation_events;
drop trigger if exists assert_message_integrity on public.messages;
drop trigger if exists assert_conversation_integrity on public.conversations;
drop trigger if exists assert_channel_integrity on public.channels;

drop function if exists app_private.assert_automation_event_integrity();
drop function if exists app_private.assert_message_integrity();
drop function if exists app_private.assert_conversation_integrity();
drop function if exists app_private.assert_channel_integrity();

drop table if exists public.automation_events;
drop table if exists public.messages;
drop table if exists public.conversations;
drop table if exists public.channels;
