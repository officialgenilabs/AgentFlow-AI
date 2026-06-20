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
