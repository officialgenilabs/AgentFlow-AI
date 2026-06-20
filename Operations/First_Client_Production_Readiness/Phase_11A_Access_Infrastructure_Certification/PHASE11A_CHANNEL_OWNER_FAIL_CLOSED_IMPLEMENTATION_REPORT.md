# Phase 11A — Channel Owner + Fail-Closed Routing Implementation Report

**Timestamp:** 2026-06-20T00:57:09Z
**Branch:** `release/agentflow-v2-production`
**Scope:** Additive database/app/n8n safety changes only.
**Outcome:** **IMPLEMENTED — READY FOR FOUNDER REVIEW BEFORE SEEDING**

## 1. Root Cause Fixed

The active Evolution inbound path previously allowed missing Evolution instance identity to fall back to `AgentFlow_Primary` in n8n. The app outbound helper also allowed missing outbound instance identity to fall back to `AgentFlow_Primary` via environment/default values.

Fixed root causes:

- n8n no longer defaults missing instance identity to `AgentFlow_Primary`.
- Evolution inbound now routes through a database fail-closed RPC before any tenant/lead/conversation mutation.
- Outbound helper now requires an explicit Evolution instance and throws `evolution_instance_required` if missing.
- `AgentFlow_Primary` is locked to Gen I Labs/internal channel context only using an explicit channel metadata guard.

## 2. Database Migration Summary

Migration added:

- `supabase/migrations/20260620_phase11a_channel_owner_fail_closed_routing.sql`

Database changes:

- Added first-class channel fields:
  - `owner_user_id`
  - `default_assignee_user_id`
  - `visibility_scope`
  - `fail_closed_policy`
  - `created_by_user_id`
  - `updated_by_user_id`
- Added same-organization validation in `app_private.assert_channel_integrity()`.
- Added case-insensitive `AgentFlow_Primary` lock unless `channels.metadata.routing_scope='gen_i_labs_internal'`.
- Added `public.inbound_routing_rejections` for sanitized quarantine/rejection evidence.
- Added sanitized helper functions:
  - `app_private.redact_identifier(text)`
  - `app_private.sha256_text(text)`
  - `app_private.log_inbound_routing_rejection(...)`
- Added provider-specific guarded RPC:
  - `public.ingest_evolution_inbound_message(...)`
- Updated canonical inbound ingestion:
  - `public.ingest_inbound_message(...)` now propagates `channels.default_assignee_user_id` to new/unassigned `leads.assigned_owner_user_id` and `conversations.assigned_owner_user_id`.
  - Routing audit metadata is written to lead/conversation/message/event context.
- Updated governed outbound RPC:
  - `public.send_outbound_message(...)` now requires explicit active Evolution channel instance and blocks non-internal `AgentFlow_Primary` use.

## 3. Quarantine/Rejection Behavior

Default unknown/unmapped behavior is **quarantine**.

Fail-closed outcomes:

| Case | Outcome |
|---|---|
| Missing instance identity | `quarantined`, no tenant mutation |
| Unknown instance | `quarantined`, no tenant mutation |
| Disabled/paused channel | `rejected`, known org/channel only, no message/lead mutation |
| Ambiguous channel mapping | `rejected`, no tenant selected |
| Missing owner/default assignee | `quarantined`, no message/lead mutation |
| Inactive/cross-tenant owner/default assignee | `quarantined`, no message/lead mutation |
| Malformed instance identity | `rejected`, no tenant mutation |
| Known active mapped instance with valid owner/default assignee | Accepted and routed to channel tenant/default assignee |
| `fromMe=true` inbound | Ignored safely; no message/lead mutation |

The rejection table stores sanitized operational evidence only: reason, policy, redacted/hash instance identity, resolution status, safe workflow id, remediation hint, metadata booleans/hashes, and timestamps. It does not store raw WhatsApp payloads, QR contents, tokens, API keys, webhook secrets, or private message bodies.

## 4. n8n Changes Summary

Workflow updated:

- Name: `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion`
- ID: `8QAshjrkLrNF5kDI`
- Active: yes

Node changes:

- `Normalize Evolution Payload`
  - Removed final fallback to `AgentFlow_Primary`.
  - Extracts instance identity only from payload/header fields.
  - Always calls DB fail-closed RPC for non-transport decisions.
  - Emits only operational flags plus SQL handoff; routing decision is centralized in Postgres.
- `Call Canonical Ingestion RPC`
  - Renamed to `Call Fail-Closed Evolution Ingestion RPC`.
  - Continues to execute `={{ $json.sql }}`, now generated against `public.ingest_evolution_inbound_message(...)`.

n8n validation result:

- Valid: yes.
- Warnings remain for generic webhook/code/Postgres error handling recommendations. These are not new P0 blockers because the workflow acknowledges on receipt and the database RPC fails closed, but fuller retry/error branch hardening remains a later improvement.

## 5. App / Backend Changes Summary

Files changed:

- `src/lib/evolution.ts`
- `src/features/approvals/actions.ts`
- `src/lib/types.ts`

App changes:

- `EvolutionSendInput.instance` is now required.
- `configuredInstance(instance)` trims and requires explicit non-empty instance.
- Removed fallback chain to `EVOLUTION_INSTANCE_NAME`, `EVOLUTION_INSTANCE`, and `AgentFlow_Primary`.
- Approval send action fails closed if prepared outbound result lacks `evolution_instance`.
- Channel type definition now includes owner/default-assignee/fail-closed fields.

Outbound remains frozen unless separately authorized. No WhatsApp send endpoints were called.

## 6. Explicit Non-Actions

Confirmed not performed:

- No `Libertalia_Kopano_Primary` Evolution instance created.
- No Libertalia channel row seeded.
- No QR generated or exposed.
- No WhatsApp pairing attempted.
- No WhatsApp messages sent.
- No outbound automation enabled.
- No Phase 11B execution.
- No Kopano temporary password created, used, stored, or requested.

## 7. Current Gate Impact

| Gate | Status after implementation | Reason |
|---|---:|---|
| G03 | WAITING ON KOPANO | Kopano final private reset/login still required. |
| G06 | REVALIDATION REQUIRED | Route/foundation safer, but no Libertalia instance/channel exists yet. |
| G07 | NOT STARTED / WAITING ON FOUNDER | QR pairing not authorized and not performed. |
| G08 | REVALIDATION REQUIRED → foundation implemented | n8n fallback removed and workflow validates; live webhook proof still requires correct instance/channel + pairing. |
| G10 | REVALIDATION REQUIRED → foundation implemented | Owner propagation foundation exists; live inbound proof still pending. |
| G11 | PREPARED | Phase 11B remains plan only. |
| G12 | NOT STARTED | Phase 11A remains incomplete until all gates pass. |

## 8. Recommended Founder Next Action

Approve the next narrow step only if satisfied with this report and validation evidence:

1. Seed/admin-create the `Libertalia_Kopano_Primary` channel mapping for Libertalia/Kopano **without QR pairing yet**, or
2. Request remediation if any validation item is insufficient.

Do not proceed to instance creation, QR pairing, inbound WhatsApp testing, outbound enablement, or Phase 11B without separate founder approval.
