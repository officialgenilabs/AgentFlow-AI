# Phase 11A — Channel Owner + Fail-Closed Routing Implementation Plan

**Timestamp:** 2026-06-20 00:16 UTC continuation
**Mode:** Approved narrow implementation executed — database/app/n8n safety changes only; no Evolution instance creation, no QR pairing, no WhatsApp send, no outbound enablement, and no Phase 11B execution.
**Branch:** `release/agentflow-v2-production`
**Current decision:** **Do not create `Libertalia_Kopano_Primary` yet.**
**Implementation decision:** Founder approval granted on 2026-06-20; narrow fail-closed channel-owner routing fix implemented and validated. See implementation and validation reports.

## 1. Current Risk Summary

The Phase 11A architecture checkpoint found that AgentFlow AI has strong tenant-isolation foundations, but the Evolution / WhatsApp routing layer is not yet safe enough for Libertalia multi-agent onboarding.

Current unsafe risk:

```text
missing Evolution instance identity
→ n8n Normalize Evolution Payload fallback
→ AgentFlow_Primary
→ possible wrong channel lookup / wrong tenant attribution / wrong operator path
```

Even though `public.ingest_inbound_message(...)` requires an active channel and does not directly create messages without a resolved channel, the n8n fallback can cause a missing client instance identity to be treated as `AgentFlow_Primary`. That is unacceptable for a commercial multi-tenant, multi-agent system.

Required behavior before any Libertalia instance exists:

- no default to `AgentFlow_Primary`
- no silent tenant fallback
- no cross-tenant message creation
- no lead creation without deterministic tenant attribution
- no owner assignment without deterministic channel mapping
- no outbound from unknown, disabled, ambiguous, or unmapped channels
- clear operational logging / quarantine evidence for admin review

## 2. Exact Root Cause

### 2.1 n8n fallback root cause

Workflow inspected read-only:

- Workflow name: `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion`
- Workflow id: `8QAshjrkLrNF5kDI`
- Active: yes
- Relevant node: `Normalize Evolution Payload`
- Current code path:

```js
const instance = first(
  body.instance,
  body.instanceName,
  data.instance,
  data.instanceName,
  body.instanceId,
  'AgentFlow_Primary'
);
```

Risk:

- If Evolution omits, renames, malforms, or fails to provide instance identity, the workflow substitutes `AgentFlow_Primary`.
- `AgentFlow_Primary` is reserved for Gen I Labs / internal operations and must not be used for Libertalia.
- This creates a silent fallback path instead of a fail-closed routing decision.

### 2.2 n8n webhook response root cause

Node inspected:

- `Evolution Inbound Webhook`
- `responseMode`: `onReceived`
- `responseCode`: `200`

Risk:

- The webhook acknowledges immediately before downstream routing validation finishes.
- If downstream validation fails, the upstream receives a 200 while n8n records an error execution.
- This is operationally visible only to operators who inspect n8n executions, not to an AgentFlow admin surface.

### 2.3 Database owner mapping root cause

Current `public.channels` fields from Stage C migration:

- `id`
- `organization_id`
- `provider`
- `channel_type`
- `display_name`
- `external_channel_id`
- `inbound_identifier`
- `status`
- `metadata`
- `created_at`
- `updated_at`

Current useful constraints:

- `status` must be one of `active`, `paused`, `disabled`.
- `channels_provider_external_global_unique_idx` exists on `(provider, external_channel_id)` where `external_channel_id is not null`.
- `public.ingest_inbound_message(...)` resolves organization from the active channel row and raises `active_channel_required` if no active channel exists.

Missing for multi-agent routing:

- no first-class `owner_user_id`
- no first-class `default_assignee_user_id`
- no `created_by_user_id` / `updated_by_user_id`
- no explicit `fail_closed_policy`
- no enforced owner/default-assignee same-tenant validation on `channels`
- no deterministic owner propagation into `conversations.assigned_owner_user_id` or `leads.assigned_owner_user_id`

### 2.4 Outbound helper fallback root cause

Application helper inspected:

- File: `src/lib/evolution.ts`
- Function: `configuredInstance(instance?: string | null)`
- Current behavior:

```ts
return instance || process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || "AgentFlow_Primary";
```

Risk:

- Governed outbound remains frozen today, but future approved outbound can still fall back to `AgentFlow_Primary` if a prepared outbound result does not include a deterministic Evolution instance.
- Phase 11A must keep outbound frozen; implementation should still remove this fallback before commercial multi-channel sending.

## 3. Target Architecture

Desired routing model:

```text
Evolution instance
→ communication channel record
→ tenant
→ channel owner / default assignee
→ permitted operators/admins
→ inbox/conversation
→ lead owner
→ approval workflow
→ Signal Orchestration event(s)
→ Routing Audit Trail
```

For the intended first Libertalia mapping after approval:

| Layer | Intended value |
|---|---|
| Evolution instance | `Libertalia_Kopano_Primary` |
| Tenant | Libertalia Properties / `libertalia-properties` |
| Channel record | `public.channels` row with `provider='evolution'`, `channel_type='whatsapp'`, `external_channel_id='Libertalia_Kopano_Primary'` |
| Channel owner | Kopano |
| Default assignee | Kopano |
| Role | Operator / agent; currently represented by membership role `member` unless explicit role semantics are added later |
| Principal/admin visibility | Tenant owner/admin/platform-admin can see all tenant routing evidence |
| Fail-closed policy | Unknown, disabled, missing, malformed, ambiguous, or owner-invalid instance must not create lead/message/conversation and must create safe rejection/quarantine evidence |

## 4. Required Design Decisions — Answers

### 1. Where should channel ownership live?

**Recommendation:** first-class database columns on `public.channels`, with n8n and app/backend reading from the database.

Decision:

- Do not put ownership primarily in n8n config or environment variables.
- Do not rely only on `channels.metadata` for production ownership.
- Use `public.channels` as the canonical routing registry because it already owns `organization_id`, provider, channel type, external channel id, status, and RLS context.
- n8n should extract and validate the Evolution instance, then call/query the database mapping. It should not decide tenant or owner from local workflow constants.

Acceptable temporary bridge only if founder rejects a migration:

- Use `channels.metadata.default_assignee_user_id`, `channels.metadata.owner_user_id`, and `channels.metadata.fail_closed_policy` with strict validation in DB functions.
- This is weaker and not recommended for commercial onboarding.

### 2. What fields are required?

Current fields retained:

- `id` as `channel_id`
- `organization_id` as `tenant_id`
- `provider`
- `channel_type`
- `display_name`
- `external_channel_id` as Evolution `instanceName`
- `status`
- `metadata`
- `created_at`
- `updated_at`

Recommended migration fields:

| Field | Type | Required for Phase 11A? | Purpose |
|---|---|---:|---|
| `owner_user_id` | `uuid references public.profiles(id) on delete restrict` | Yes | Human owner/account owner for the channel. |
| `default_assignee_user_id` | `uuid references public.profiles(id) on delete restrict` | Yes for agent-owned channels | User assigned to new conversations/leads from this channel. |
| `visibility_scope` | `text` check `agent_owned`, `agency_shared` | Yes | Distinguishes per-agent vs shared agency lines. |
| `fail_closed_policy` | `text` check `reject`, `quarantine` | Yes | Defines whether invalid inbound is rejected or quarantined. |
| `created_by_user_id` | `uuid references public.profiles(id)` | Recommended | Operational accountability. |
| `updated_by_user_id` | `uuid references public.profiles(id)` | Recommended | Operational accountability. |
| `routing_notes` | `text` nullable | Optional | Non-secret admin note. |

Fields not recommended as separate columns:

- `evolution_instance_name`: use existing `external_channel_id` when `provider='evolution'` to avoid duplicate identity drift.
- `is_enabled`: use existing `status`; `status='active'` is enabled, `paused/disabled` is not enabled.

Recommended new operational table:

`public.inbound_routing_rejections`

Purpose: store safe, admin-visible fail-closed evidence without creating messages/leads in the wrong tenant.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid null references public.organizations(id) on delete set null`
- `channel_id uuid null references public.channels(id) on delete set null`
- `provider text not null`
- `external_channel_id text null`
- `reason text not null`
- `policy text not null check (policy in ('reject', 'quarantine'))`
- `event_type text null`
- `external_message_id_hash text null`
- `external_conversation_id_hash text null`
- `payload_fingerprint text null`
- `sanitized_payload jsonb not null default '{}'::jsonb`
- `status text not null default 'open' check (status in ('open', 'reviewed', 'ignored', 'resolved'))`
- `created_at timestamptz not null default now()`
- `reviewed_at timestamptz null`
- `reviewed_by_user_id uuid null references public.profiles(id)`

Privacy rule: store only sanitized metadata and hashes, never raw private payloads, phone numbers, QR contents, tokens, or message bodies.

### 3. How will inbound messages resolve tenant and owner?

Recommended resolution sequence:

1. n8n extracts instance from approved Evolution fields only.
2. If missing or malformed, fail closed before calling ingestion.
3. n8n calls a DB resolver or guarded query by:
   - `provider='evolution'`
   - `external_channel_id=<normalized instance>`
   - `status='active'`
4. DB resolver returns exactly one active channel, organization, owner, default assignee, visibility scope, and fail-closed policy.
5. Resolver validates:
   - channel is active
   - channel maps to exactly one tenant
   - default assignee belongs to the same tenant
   - owner belongs to the same tenant when present
   - default assignee profile/membership is active
6. `public.ingest_inbound_message(...)` creates/updates tenant-scoped lead/conversation/message using the channel id.
7. New conversation owner is set to `default_assignee_user_id` when created.
8. Existing conversation owner is preserved unless null; if null, backfill to `default_assignee_user_id`.
9. New or unassigned lead owner is set to `default_assignee_user_id` without overriding an existing valid owner.
10. Automation/audit payload records routing decision fields.

Recommended DB function options:

- Preferred: `public.ingest_evolution_inbound_message(...)` that takes `p_instance_name` and validates mapping internally before calling `public.ingest_inbound_message(...)`.
- Acceptable: `public.resolve_channel_routing(...)` plus existing `public.ingest_inbound_message(...)` if n8n handles the two-step flow and rejection logging.

Preferred path is one RPC to reduce n8n complexity and avoid duplicating validation logic.

### 4. What happens if instance name is missing?

Fail closed.

Recommended behavior:

- n8n does not substitute a default instance.
- Record `reason='evolution_instance_missing'` in `inbound_routing_rejections` with no `organization_id` and no `channel_id`.
- Do not call `ingest_inbound_message(...)`.
- Do not create conversation, lead, message, approval, Signal Orchestration event, or outbound task.
- Return explicit safe response or mark quarantine depending on founder decision.

### 5. What happens if instance exists but has no owner?

For `visibility_scope='agent_owned'`: fail closed.

Recommended behavior:

- Record `reason='channel_default_assignee_missing'` or `channel_owner_missing`.
- Set `organization_id` and `channel_id` if the channel is known.
- Do not create lead/message/conversation until owner mapping is corrected.

For `visibility_scope='agency_shared'`: allow only if founder approves shared-queue semantics and a default agency queue/admin owner is defined. Otherwise fail closed.

### 6. What happens if instance is disabled?

Fail closed.

Recommended behavior:

- Record `reason='channel_disabled'` or `channel_paused`.
- Include organization/channel ids if resolvable.
- Do not call ingestion.
- No outbound can be prepared for disabled channels because `send_outbound_message(...)` already checks active channel; keep that guard.

### 7. What happens if instance maps to multiple tenants?

Fail closed and treat as a P0 configuration/security incident.

Current global unique index should prevent this for non-null `external_channel_id`, but the resolver should still guard with an exact count check.

Recommended behavior:

- Record `reason='ambiguous_channel_mapping'`.
- Do not choose a tenant.
- Alert/report to founder/admin before any instance creation proceeds.

### 8. What happens if owner is inactive?

Fail closed for agent-owned channels.

Recommended behavior:

- Validate active membership in `organization_members`.
- Record `reason='default_assignee_inactive'` or `owner_inactive`.
- Do not create new lead/message/conversation.
- Admin must update channel mapping before retry.

### 9. How is the failure logged?

Recommended layered logging:

1. `inbound_routing_rejections` for sanitized admin-visible routing evidence.
2. n8n error execution / workflow execution for technical trace.
3. Optional platform-admin-only notification later, not required for Phase 11A.
4. For known tenant/channel failures, optionally emit an org-scoped audit record only after a safe org is resolved.

Unknown/missing instance cannot safely write tenant audit logs because tenant is not deterministic.

### 10. Where can founder/admin see quarantined or rejected inbound events?

Minimum Phase 11A:

- Database/admin query against `inbound_routing_rejections`, restricted to platform admins and tenant owner/admins where `organization_id` is known.
- n8n error executions for workflow-level trace.

Deferred UI:

- Admin-only Channel Routing Diagnostics page under `/app/[orgSlug]/settings/channels` or similar.
- Platform-level Routing Rejections page for unknown/unmapped events.

### 11. What is the minimum viable safe implementation for Phase 11A?

Minimum required before creating `Libertalia_Kopano_Primary`:

1. Add first-class `channels.owner_user_id` and `channels.default_assignee_user_id` or founder-approved metadata contract.
2. Add channel-owner same-org and active-membership validation.
3. Remove n8n fallback to `AgentFlow_Primary`.
4. Add fail-closed handling for missing/malformed/unknown/disabled/ambiguous/owner-invalid instances.
5. Ensure inbound ingestion assigns new conversation/lead ownership deterministically from channel default assignee.
6. Ensure outbound helper does not fall back to `AgentFlow_Primary` when `prepared.evolution_instance` is missing.
7. Add sanitized rejection/quarantine evidence visible to admins.
8. Seed/create Libertalia channel row only after founder approves exact instance name and owner model.

### 12. What should be deferred to later multi-client scale work?

Can defer beyond Phase 11A:

- Full channel-management UI for all admins.
- Per-agent private visibility enforcement.
- New explicit `operator`, `principal`, `viewer` roles.
- Advanced reassignment workflow and SLA escalation.
- Multi-agent reporting dashboards.
- Bulk channel onboarding.
- Cross-provider channel abstraction beyond Evolution/WhatsApp and Property24.
- Automated founder/admin notifications for quarantine events.
- Load testing for 5-10+ agents.

## 5. Data Model Change Plan

### 5.1 Recommended migration

Create a narrow migration, for example:

`supabase/migrations/YYYYMMDD_phase11a_channel_owner_fail_closed_routing.sql`

Recommended changes:

1. Add columns to `public.channels`:
   - `owner_user_id uuid null references public.profiles(id) on delete restrict`
   - `default_assignee_user_id uuid null references public.profiles(id) on delete restrict`
   - `visibility_scope text not null default 'agency_shared' check (visibility_scope in ('agent_owned', 'agency_shared'))`
   - `fail_closed_policy text not null default 'quarantine' check (fail_closed_policy in ('reject', 'quarantine'))`
   - `created_by_user_id uuid null references public.profiles(id) on delete set null`
   - `updated_by_user_id uuid null references public.profiles(id) on delete set null`
2. Extend `app_private.assert_channel_integrity()`:
   - owner/default assignee must belong to the channel organization.
   - default assignee must be active for `agent_owned` channels.
   - `provider='evolution'` with `channel_type='whatsapp'` must have a nonblank `external_channel_id` before activation.
   - `agent_owned` active channels must have a `default_assignee_user_id`.
3. Add `public.inbound_routing_rejections` with strict RLS.
4. Add helper function to write sanitized rejection evidence.
5. Update `public.ingest_inbound_message(...)` or create `public.ingest_evolution_inbound_message(...)` to propagate default assignment.
6. Update automation event payloads to include routing audit fields:
   - `routing_provider`
   - `external_channel_id`
   - `channel_id`
   - `organization_id`
   - `resolved_owner_user_id`
   - `default_assignee_user_id`
   - `assignment_source`
   - `fail_closed_policy`

### 5.2 Is migration required before creating `Libertalia_Kopano_Primary`?

**Yes, recommended.**

A schema migration is the safest path because channel ownership is a commercial routing invariant, not a workflow preference. Putting it in first-class database fields gives:

- same-tenant enforcement
- active-owner enforcement
- RLS-compatible admin visibility
- deterministic lead/conversation assignment
- portable behavior beyond n8n
- safer future provider expansion

If founder chooses a short-term metadata-only bridge, that decision should be explicitly recorded as a temporary exception and revalidated before 3+ agent rollout.

### 5.3 RLS and tenant isolation implications

Expected RLS posture:

- Existing channel select/write policies should remain least-privilege.
- Tenant members may read their tenant channels if existing policy allows it.
- Channel ownership write should remain restricted to platform admins or org owner/admin roles.
- `inbound_routing_rejections`:
  - platform admins can read all rows.
  - org owner/admin can read rows where `organization_id` matches their org.
  - regular members should not read unknown/unmapped rejection rows by default.
  - insert should be service-role / security-definer function only, not direct client insert.

## 6. n8n Change Plan

### 6.1 Affected workflow

Workflow:

- `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion`
- ID: `8QAshjrkLrNF5kDI`
- Active version: `3d7cb8c8-63cb-402b-b9a9-407e63a61e4c`

### 6.2 Node/path audit

| Node/path | Current behavior | Risk | Required change | Expected safe behavior | Test case | Rollback path |
|---|---|---|---|---|---|---|
| `Evolution Inbound Webhook` | POST `/agentflow-stage-c-inbound`, `responseMode=onReceived`, returns 200 immediately. | Upstream sees success even when routing fails later. | Switch to explicit response node or log quarantine before response. | Unknown/missing instances produce explicit reject/quarantine response and durable log. | Submit synthetic missing-instance payload to test webhook only after approval. | Restore exported previous workflow version; reactivate prior version if response handling breaks Evolution retry behavior. |
| `Normalize Evolution Payload` | Extracts instance and falls back to `'AgentFlow_Primary'`. | Missing instance can route as internal Gen I Labs instance. | Remove fallback. Validate presence, trim, normalize, and enforce safe character/length policy. | Missing/malformed instance returns fail-closed path, never `AgentFlow_Primary`. | Payload with no `instance`/`instanceName` fails closed. | Revert Code node to previous version only if no client instance is active; otherwise keep workflow disabled until fixed. |
| `Normalize Evolution Payload` → SQL generation | Generates SQL calling `ingest_inbound_message((select id from public.channels ...), ...)`. | Unknown instance can pass null channel id and fail only inside DB; no admin quarantine table. | Call a DB resolver/RPC or add pre-resolution + quarantine branch. | Unknown/disabled/owner-invalid routes to rejection logging, no message/lead mutation. | Unknown instance `Bad_Instance` writes sanitized rejection and no lead/message. | Restore prior query after disabling client workflows, or revert workflow version. |
| `Call Canonical Ingestion RPC` | Executes generated SQL. | No retry/error handling and no explicit classification for routing failure. | Use guarded RPC result with status or separate branches for `accepted`, `rejected`, `quarantined`. | Known mapped instance ingests; invalid mapping logs and stops. | Known mapped synthetic payload resolves correct channel id. | Workflow version rollback. |

### 6.3 Recommended workflow shape

Preferred implementation shape:

```text
Webhook
→ Normalize + validate Evolution payload
→ IF missing/malformed instance
   → Log routing rejection/quarantine
   → Respond fail-closed
→ Resolve channel routing in DB
→ IF rejected/quarantined
   → Log/return fail-closed
→ Call canonical ingestion RPC
→ Respond accepted
```

Recommended normalization rule:

```js
const instance = first(body.instance, body.instanceName, data.instance, data.instanceName, body.instanceId);
if (!instance) throw new Error('evolution_instance_missing_fail_closed');
```

Do not use:

```js
'AgentFlow_Primary'
```

as any fallback in inbound routing.

### 6.4 Reject vs quarantine

Recommended default for Phase 11A: **quarantine**.

Why:

- preserves safe diagnostic evidence
- avoids wrong-tenant mutation
- gives founder/admin visibility
- reduces risk of upstream retry storms if Evolution treats non-2xx as retryable

Use hard reject for malformed/malicious payloads if founder prefers strict upstream signaling.

## 7. App / Backend Change Plan

### 7.1 Inbound ingestion changes

Required:

- Update `public.ingest_inbound_message(...)` or create a provider-specific wrapper so routing owner is resolved inside the database.
- Set new conversation `assigned_owner_user_id` from channel `default_assignee_user_id`.
- If an existing conversation has null owner, backfill from channel default assignee.
- If a lead is newly created or has null owner, assign `leads.assigned_owner_user_id` from channel default assignee.
- Do not overwrite an existing valid lead owner without explicit reassignment action.
- Add routing audit fields to automation event payloads.

Recommended owner propagation:

```text
new inbound from active agent-owned channel
→ default_assignee_user_id resolved
→ new/empty conversation assigned_owner_user_id = default_assignee_user_id
→ new/unassigned lead assigned_owner_user_id = default_assignee_user_id
→ message stored under channel/tenant
→ automation event includes routing_audit
```

### 7.2 Outbound helper changes

Required before outbound activation for multi-agent channels:

- Remove `"AgentFlow_Primary"` fallback from `src/lib/evolution.ts`.
- `sendEvolutionTextMessage(...)` should throw `evolution_instance_required` if `input.instance` is missing.
- Keep `OUTBOUND_TRANSPORT_ENABLED` frozen until Phase 11B+ authorization.
- `send_outbound_message(...)` should raise if a channel has no `external_channel_id` / evolution instance.

### 7.3 Frontend/admin configuration

Minimum Phase 11A:

- UI is not required if channel row is seeded/admin-managed through a controlled migration/script after founder approval.
- Admin-visible rejection evidence can initially be via DB/admin query plus n8n execution logs.

Recommended before broader rollout:

- Minimal admin-only channel mapping view showing:
  - display name
  - provider/channel type
  - external instance name
  - status
  - visibility scope
  - owner/default assignee
  - fail-closed policy
  - last routing rejection count / timestamp

## 8. Signal Orchestration + Routing Audit Trail

Successful mapped inbound should emit or enrich existing automation/audit events with:

- provider
- external channel id / instance name
- channel id
- tenant id
- resolved owner id
- default assignee id
- assignment source (`channel.default_assignee_user_id`)
- visibility scope
- fail-closed policy
- routing decision (`accepted`)

Rejected/quarantined inbound should write `inbound_routing_rejections` with:

- provider
- instance name if present
- known tenant/channel only if deterministic
- reason
- policy
- sanitized event metadata
- payload fingerprint/hash
- status for admin review

No private message body, phone number, QR data, tokens, or raw payload should be stored in these diagnostics.

## 9. Validation Plan

### 9.1 Required tests

| # | Case | Expected result |
|---:|---|---|
| 1 | Known mapped instance | Routes to correct tenant/channel/default owner; creates/updates conversation/message/lead; audit payload includes routing decision. |
| 2 | Unknown instance | Fail closed; no lead/message/conversation; sanitized rejection/quarantine row created. |
| 3 | Disabled/paused instance | Fail closed; known org/channel rejection row; no lead/message/conversation. |
| 4 | Mapped tenant but missing owner/default assignee on agent-owned channel | Fail closed or quarantined for admin review; no lead/message/conversation. |
| 5 | Owner/default assignee inactive or not same org | Fail closed; no lead/message/conversation. |
| 6 | `AgentFlow_Primary` inbound | Routes only to Gen I Labs/internal channel if a valid active Gen I Labs channel row exists; never routes to Libertalia. |
| 7 | `Libertalia_Kopano_Primary` inbound | Routes only to Libertalia/Kopano after approved channel row exists. |
| 8 | Malicious/malformed instance field | Fail closed; no SQL injection risk; sanitized rejection only. |
| 9 | Duplicate inbound message id | Existing message dedupe behavior remains intact; no duplicate message/lead. |
| 10 | Outbound remains frozen | Approved drafts still do not send while `OUTBOUND_TRANSPORT_ENABLED` is not true; no external WhatsApp sends. |

### 9.2 Pre-production checks before implementation commit

- Apply migration to staging/canonical target only under approved change window.
- Run SQL dry-run/transaction rollback proof if possible.
- Validate RLS and same-org owner enforcement.
- Validate n8n workflow with synthetic sanitized payloads only.
- Run lint/typecheck if app code changes.
- Run targeted `git diff --check`.
- Run targeted secret scan.

### 9.3 Phase 11A post-fix certification gates

After approved implementation:

- G06 can be re-evaluated for correct instance/channel strategy.
- G08 can be re-evaluated for fail-closed workflow behavior.
- G10 can be re-evaluated for inbound readiness by inspection/synthetic tests only.
- G07 and Phase 11B remain blocked until founder explicitly authorizes QR pairing and real inbound testing.

## 10. Rollback Plan

### 10.1 Database rollback

Rollback should be prepared before applying migration:

- Drop or disable new resolver wrapper if it breaks ingestion.
- Keep added nullable columns if harmless; avoid destructive rollback unless necessary.
- If columns must be removed, first verify no production data depends on them.
- Drop `inbound_routing_rejections` only if it contains no needed audit evidence or after export.
- Restore previous `ingest_inbound_message(...)` definition from migration history if owner propagation breaks ingestion.

### 10.2 n8n rollback

Before changing workflow:

- Export/current workflow JSON or record version id.
- Note active version: `3d7cb8c8-63cb-402b-b9a9-407e63a61e4c`.

Rollback:

- Deactivate modified workflow if it rejects valid traffic.
- Restore previous version or import snapshot.
- Keep client instance creation paused until rollback is verified.

### 10.3 App rollback

If outbound helper/app changes fail:

- Revert app commit.
- Keep `OUTBOUND_TRANSPORT_ENABLED` frozen.
- Do not loosen `AgentFlow_Primary` fallback for client operation.

## 11. Implementation Phases

### Phase A — Founder approval and exact policy decision

Planning artifact only. No runtime changes.

Required decisions in Section 14.

### Phase B — Database routing contract

- Add channel ownership/default assignee fields.
- Add same-org/active-member validation.
- Add rejection/quarantine table and helper.
- Add owner propagation in ingestion or provider-specific wrapper.
- Add routing audit payload fields.

### Phase C — n8n fail-closed workflow update

- Remove `AgentFlow_Primary` fallback.
- Validate instance presence/format.
- Route invalid/unknown/disabled/owner-invalid cases to rejection/quarantine path.
- Keep or adjust response behavior per founder reject/quarantine decision.

### Phase D — App/backend safety alignment

- Remove outbound `AgentFlow_Primary` fallback.
- Require explicit instance from channel for sends.
- Keep outbound frozen until later authorization.

### Phase E — Verification without client instance creation

- Run synthetic/sanitized mapping tests in staging/config-safe mode.
- Confirm no wrong-tenant mutation.
- Confirm rejection/quarantine evidence.
- Commit implementation only after tests pass.

### Phase F — Future founder-approved instance seeding

Only after Phase A-E pass and founder approves:

- Create/seed `Libertalia_Kopano_Primary` instance/channel mapping.
- Do not pair QR until G07 authorization.

## 12. Minimum Required Fix

Minimum required before `Libertalia_Kopano_Primary` can be created:

1. Database migration for channel owner/default assignee and rejection/quarantine evidence.
2. n8n removal of `AgentFlow_Primary` fallback and fail-closed unknown/missing-instance handling.
3. Ingestion owner propagation to conversations/leads.
4. Outbound helper changed to require explicit instance before any future send.
5. Targeted test evidence showing unknown/missing/disabled/owner-invalid routes do not mutate tenant data.

## 13. Recommended Go / No-Go Decision

**No-Go for instance creation.**

**Go for implementation only after founder approval.**

Recommended decision:

```text
Approve Phase 11A channel-owner + fail-closed routing implementation with first-class channel owner/default assignee fields, quarantine-by-default invalid inbound handling, AgentFlow_Primary locked to Gen I Labs/internal use only, and no Libertalia instance creation until tests pass.
```

## 14. Founder Decisions Required

Founder must explicitly decide:

1. **First-class channel ownership now?**
   - Recommended: yes, implement `owner_user_id` and `default_assignee_user_id` on `public.channels` now.

2. **Unknown/unmapped inbound policy: reject or quarantine?**
   - Recommended: quarantine by default with sanitized admin evidence; reject malformed/malicious payloads if desired.

3. **Seed `Libertalia_Kopano_Primary` after this fix passes?**
   - Recommended: yes only if the first WhatsApp number is Kopano-owned/operated; otherwise choose `Libertalia_Agency_Primary`.

4. **Lock `AgentFlow_Primary` to Gen I Labs/internal only?**
   - Recommended: yes. It must never be a client fallback.

5. **Minimal admin-only channel mapping config before broader rollout?**
   - Recommended for 3+ agents; for Phase 11A one-agent pilot, controlled admin seeding is acceptable if fully documented and audited.

## 15. Restrictions Still Active

Do not:

- create any Libertalia Evolution instance
- pair WhatsApp
- expose QR contents
- send inbound or outbound test messages
- enable outbound transport
- execute Phase 11B
- use `AgentFlow_Primary` for Libertalia
- weaken RLS or tenant isolation
- create fake client/demo data
- expose secrets, phone numbers, webhook payloads, reset links, API keys, or private message bodies
