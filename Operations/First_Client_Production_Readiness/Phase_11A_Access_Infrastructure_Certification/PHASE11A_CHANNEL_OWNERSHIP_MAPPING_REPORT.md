# Phase 11A — Channel Ownership Mapping Report

**Timestamp:** 2026-06-20 UTC
**Scope:** Evolution / WhatsApp instance-to-tenant-to-agent routing checkpoint.
**Result:** **PARTIAL — tenant channel routing exists, agent channel ownership is missing.**

## 1. Current Mapping Model

Current production model:

```text
Evolution instance name
→ n8n normalized `instance`
→ public.channels.external_channel_id
→ public.channels.organization_id
→ public.ingest_inbound_message(...)
→ public.conversations / public.leads / public.messages
→ public.automation_events
```

This is enough to map an Evolution instance to a tenant **if** an active `channels` row exists.

It is not enough to map an Evolution instance to a specific agent/operator because `channels` currently has no first-class owner/default assignee column.

## 2. Evidence

| Component | Evidence | Finding |
|---|---|---|
| `channels` table | `provider`, `channel_type`, `display_name`, `external_channel_id`, `inbound_identifier`, `status`, `metadata` | Supports multiple named channel instances. |
| Unique channel identity | `channels_provider_external_global_unique_idx` on `(provider, external_channel_id)` | Prevents duplicate Evolution instance names globally. |
| Tenant routing | `ingest_inbound_message(...)` selects channel by `p_channel_id` and uses `v_channel.organization_id` | Tenant is inherited from channel row. |
| Conversation ownership | `conversations.assigned_owner_user_id` | Owner can exist on conversation, but ingestion does not currently populate it from the channel. |
| Lead ownership | `leads.assigned_owner_user_id` | Lead owner exists and same-org integrity is enforced, but Evolution ingestion does not currently set it from channel. |
| Task ownership | `lead_tasks.assigned_to_user_id` | Per-agent task assignment exists. |
| Live Libertalia channels | `libertalia_active_channels = []` | No active Libertalia channel is configured yet. |
| Live channel metadata owner keys | all inspected active Evolution channels showed no owner/default assignee metadata keys | No proven metadata ownership contract in use. |
| n8n workflow | active workflow maps `instance` / `instanceName` to `channels.external_channel_id` | Multi-instance routing is structurally possible. |
| n8n fallback | workflow fallback value is `AgentFlow_Primary` | Unsafe for Libertalia; unknown instance must fail closed. |

## 3. Current Determinism

| Routing target | Deterministic today? | Detail |
|---|---:|---|
| Evolution instance → channel | Partial | Yes when payload includes instance and matching active channel row exists; unsafe fallback exists when missing. |
| Channel → tenant | Yes | Channel row owns `organization_id`; ingestion inherits it. |
| Channel → agent owner | No | No first-class channel owner/default assignee; ingestion does not assign owner from channel. |
| Conversation → lead | Yes | Ingestion attaches/creates lead and conversation by channel/external conversation/identity. |
| Lead → owner | Manual/partial | Owner field exists; assignment must be supplied or updated separately. |
| Approval queue → tenant | Yes | Drafts/approvals are organization-scoped. |
| Approval queue → agent | Partial | Drafts preserve conversation/lead context, but no channel-owner routing guarantee. |
| Audit trail | Partial | Automation/audit events exist; owner-resolution payload needs strengthening. |

## 4. AgentFlow_Primary Risk

`AgentFlow_Primary` is reserved for Gen I Labs / internal operations and must not be used for Libertalia.

Current active n8n normalization falls back to `AgentFlow_Primary` if instance identity is absent. That was acceptable for an internal/single-pilot assumption, but it is not acceptable for multi-client, multi-agent operation.

Required behavior before client instance creation:

- Missing instance identity: fail closed.
- Unknown instance identity: fail closed.
- Known but inactive channel: fail closed.
- Known active channel: route to that channel's tenant and owner/default assignee.

## 5. Recommended Channel Contract

### Preferred schema contract

Add first-class fields to `public.channels`:

- `owner_user_id uuid null references public.profiles(id)`
- `default_assignee_user_id uuid null references public.profiles(id)`
- optional `visibility_scope text check (visibility_scope in ('agent_owned', 'agency_shared'))`

Add trigger validation:

- owner/default assignee must belong to the same organization as the channel.
- if `visibility_scope='agent_owned'`, default assignee should be required.

### Short-term metadata contract if no schema change is approved

Use `channels.metadata` with documented keys:

- `evolution_instance`
- `default_assignee_user_id`
- `visibility_scope`
- `owner_policy`

This is acceptable only as a temporary bridge because JSON metadata is easier to drift and harder to enforce.

## 6. Instance Naming Recommendation

| Scenario | Recommended name | Reason |
|---|---|---|
| Number belongs operationally to Kopano | `Libertalia_Kopano_Primary` | Aligns with per-agent routing and future additional agent instances. |
| Number is shared agency/principal line | `Libertalia_Agency_Primary` | Signals shared queue semantics and avoids implying Kopano ownership. |

For the current intended model, choose **`Libertalia_Kopano_Primary`** after owner mapping is fixed.

## 7. Pre-Creation Checklist

Before creating any Libertalia Evolution instance:

- [ ] Founder confirms whether the number is Kopano-owned or shared agency-owned.
- [ ] Channel owner/default assignee contract is implemented or explicitly approved as a temporary metadata contract.
- [ ] n8n fallback to `AgentFlow_Primary` is removed.
- [ ] Unknown/missing instance routing fails closed.
- [ ] Libertalia channel row is created with correct org and owner mapping.
- [ ] G03 remains waiting until Kopano privately completes final reset/login.
- [ ] No QR pairing until founder authorizes and correct instance exists.

## 8. 2026-06-20 Fail-Closed Implementation Plan Addendum

Planning report added:

- `PHASE11A_CHANNEL_OWNER_FAIL_CLOSED_IMPLEMENTATION_PLAN.md`

### Root cause confirmed

Read-only n8n audit confirmed the active workflow `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion` (`8QAshjrkLrNF5kDI`) normalizes inbound Evolution payloads with a final fallback to `'AgentFlow_Primary'`. This is the exact unsafe fallback that must be removed before any Libertalia instance is created.

Source audit also found outbound helper fallback in `src/lib/evolution.ts`, where missing outbound instance identity can fall back to `AgentFlow_Primary`. Outbound remains frozen, but this fallback should be removed before any future multi-agent outbound activation.

### Recommended owner mapping model

Canonical ownership should live in `public.channels` as first-class fields, not in n8n constants or environment variables.

Recommended fields:

- `owner_user_id`
- `default_assignee_user_id`
- `visibility_scope`
- `fail_closed_policy`
- `created_by_user_id`
- `updated_by_user_id`

Existing `external_channel_id` should remain the canonical Evolution instance name for `provider='evolution'`; do not create a duplicate `evolution_instance_name` column unless there is a later UI-only need.

### Recommended fail-closed model

- Missing instance: quarantine/reject, no tenant mutation.
- Unknown instance: quarantine/reject, no tenant mutation.
- Disabled/paused instance: quarantine/reject, known org/channel if safely resolvable, no message/lead mutation.
- Ambiguous mapping: P0 fail-closed incident, no tenant selected.
- Owner/default assignee missing or inactive on agent-owned channel: quarantine/reject, no message/lead mutation.
- Known active mapped instance: create/attach conversation/message/lead under the channel tenant and assign new/unassigned records to the deterministic channel default assignee.

### Founder approval required before implementation

1. Approve first-class channel ownership fields now.
2. Choose quarantine vs reject for unknown/unmapped inbound.
3. Confirm whether `Libertalia_Kopano_Primary` should be seeded after the fix passes.
4. Confirm `AgentFlow_Primary` is locked to Gen I Labs/internal use only.
5. Decide whether minimal admin-only channel mapping UI is required before broader rollout, or whether controlled admin seeding is acceptable for Phase 11A.

## 9. 2026-06-20 Implementation Addendum

**Result:** **CHANNEL OWNER MAPPING FOUNDATION IMPLEMENTED — DO NOT SEED CLIENT CHANNEL WITHOUT SEPARATE APPROVAL**

Implemented changes:

- `public.channels` now has first-class ownership/default assignment fields: `owner_user_id`, `default_assignee_user_id`, `visibility_scope`, and `fail_closed_policy`.
- Channel integrity now validates same-organization owner/default assignee membership.
- `public.inbound_routing_rejections` stores sanitized quarantine/rejection evidence.
- `public.ingest_evolution_inbound_message(...)` now resolves Evolution instance identity to a deterministic channel before calling canonical ingestion.
- `public.ingest_inbound_message(...)` now propagates channel default assignee to new/unassigned leads and conversations.
- `AgentFlow_Primary` is case-insensitively reserved for Gen I Labs/internal channel context only.
- n8n workflow `8QAshjrkLrNF5kDI` no longer defaults missing instance identity to `AgentFlow_Primary`.
- App outbound helper no longer defaults missing instance identity to `AgentFlow_Primary` or env fallback.

Validation:

- Known mapped synthetic rollback channel routed to correct org/default assignee.
- Unknown instance quarantined.
- Disabled channel rejected.
- Missing/inactive owner quarantined.
- Ambiguous case-variant mapping rejected.
- Malformed instance rejected.
- Duplicate external message deduped.
- Future Libertalia/Kopano mapping pattern validated by the same channel-registry mechanism without creating or seeding `Libertalia_Kopano_Primary`.

Remaining blocker:

- No live Libertalia channel row exists yet. `Libertalia_Kopano_Primary` must only be seeded/admin-created after founder separately approves the next step.
