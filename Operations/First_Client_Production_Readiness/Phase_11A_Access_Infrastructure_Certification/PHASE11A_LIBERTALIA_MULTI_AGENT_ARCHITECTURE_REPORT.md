# Phase 11A — Libertalia Multi-Agent Architecture Report

**Timestamp:** 2026-06-20 UTC
**Mode:** Architecture checkpoint only — no instance creation, QR pairing, WhatsApp send, outbound enablement, or Phase 11B execution.
**Final architecture outcome:** **MULTI-AGENT ARCHITECTURE PARTIAL — CONFIG/FIXES REQUIRED BEFORE INSTANCE CREATION**

## 1. Executive Finding

AgentFlow AI can support Libertalia Properties as a tenant-isolated agency workspace with multiple users, shared agency visibility, tenant branding, CRM ownership, governed approvals, and audit/automation event trails.

However, it is **not yet certified** for per-agent WhatsApp/Evolution onboarding because channel ownership and deterministic agent assignment are not first-class in the current production model. The system can deterministically resolve **tenant** from an active channel row, but it does not deterministically resolve **agent/channel owner** from an Evolution instance today.

Therefore: **do not create or pair `Libertalia_Kopano_Primary` yet.** First add/confirm a dedicated Libertalia channel mapping and deterministic channel-owner assignment behavior.

## 2. Evidence Reviewed

| Evidence | Finding |
|---|---|
| `evidence/g06_g10_multi_agent_architecture_source_evidence_20260619.txt` | Source confirms org membership, RLS, channels, conversations, messages, automation events, lead ownership, task ownership, branding, governed approvals, and ingestion functions. |
| `evidence/g06_g10_multi_agent_live_schema_evidence_20260619.txt` | Live schema confirms Libertalia org exists, one active member, branding row, no active Libertalia channels, active Evolution channels only for demo/rival tenants, RLS enabled, and core functions live. |
| `evidence/g06_g10_multi_agent_architecture_followup_evidence_20260619.txt` | Follow-up source evidence confirms UI/data access is organization-scoped, channel ownership is not a first-class column, inbox/leads/tasks display owner fields, and app shell uses tenant context. |
| n8n workflow `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion` (`8QAshjrkLrNF5kDI`) | Workflow is active and maps inbound Evolution `instance` / `instanceName` to `public.channels.external_channel_id`; missing instance falls back to `AgentFlow_Primary`, which is unsafe for client onboarding. |
| `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md` and `evidence/g06_evolution_503_remediation_20260619.txt` | Canonical Evolution public route is healthy and protected, but no dedicated Libertalia instance/channel has been created. |

## 3. Required Questions — Direct Answers

### 1. Can Libertalia support multiple users/agents under one tenant today?

**Yes, structurally.**

Evidence:

- `organization_members` supports multiple users per organization with unique `(organization_id, user_id)`.
- Roles currently available: `owner`, `admin`, `member`.
- Live Libertalia membership currently has only one active user, Kopano, role `member`.
- RLS policies scope tenant data to organization members or platform admins.

Limit:

- Roles are coarse. There is no separate `operator`, `principal`, `agent`, or `viewer` role yet.

### 2. Can each agent have their own Evolution/WhatsApp instance today?

**Partially.**

The `channels` table can represent multiple Evolution/WhatsApp channels through `provider='evolution'`, `channel_type='whatsapp'`, and unique `external_channel_id` values. The n8n workflow can route by Evolution instance name into the matching channel row.

Gap:

- No active Libertalia Evolution channel exists.
- No first-class `owner_user_id`, `default_assignee_user_id`, or `channel_owner_user_id` exists on `channels`.
- Live channel metadata does not use owner keys.
- Therefore an instance can map to a tenant, but not yet deterministically to a specific Libertalia agent.

### 3. Can inbound messages route deterministically to the correct tenant and agent today?

**Tenant: yes, if and only if a correct active channel row exists. Agent: no.**

Current path:

Evolution webhook payload → n8n extracts `instance` / `instanceName` → n8n selects `public.channels.id` by `provider='evolution'` and `external_channel_id=<instance>` → `ingest_inbound_message(...)` resolves organization from the channel row → creates/attaches lead, conversation, message, and automation events.

Gaps:

- `ingest_inbound_message(...)` does not set `conversations.assigned_owner_user_id` from channel owner metadata or a channel owner column.
- `ingest_lead_from_intake(...)` does not receive a default owner from the channel.
- If an Evolution payload omits instance identity, the n8n workflow currently falls back to `AgentFlow_Primary`; that is unsafe for Libertalia.

### 4. Can the agency/principal see all activity across agents today?

**Yes at tenant level, but with broad visibility.**

Evidence:

- Inbox, leads, approvals, tasks, messages, drafts, automation events, audit logs, and branding are queried by `organization_id`.
- RLS permits organization members to select tenant records.
- Owner/admin roles exist and branding/channel management is restricted to owner/admin/platform admin.

Limit:

- There is no per-agent private queue enforcement. Members can generally see all tenant records, not only their own.
- This supports principal visibility, but not agent-private segmentation.

### 5. Can Libertalia branding be configured separately from Gen I Labs today?

**Yes, with current white-label limits.**

Evidence:

- `organization_branding` is keyed by `organization_id`.
- `resolveTenantBySlug(...)` loads organization and branding for the tenant context.
- The app shell renders `organization.name` and brand color variables from tenant branding.
- The Brand System writes logo/colors through `updateBranding(...)` and requires owner/admin/platform admin.

Limit:

- Branding is logo/color/name oriented. Some shell copy still says Gen I Labs / AgentFlow AI and is not fully tenant-custom copy.

### 6. What is the safest name for Kopano's first instance?

**Recommended name: `Libertalia_Kopano_Primary`**, but only after the deterministic owner mapping gap is fixed.

Rationale:

- The intended operating model is per-agent instances.
- Naming the first operator-owned number `Libertalia_Kopano_Primary` prevents confusing it with a future shared agency inbox.
- Use `Libertalia_Agency_Primary` only if the number is explicitly a shared agency/principal number, not Kopano's operational line.

### 7. What gaps must be fixed before scaling to 5–10 agents?

Minimum required gaps:

1. Add a first-class channel owner/default assignee field or enforced metadata contract for `channels`.
2. Update ingestion so channel owner/default assignee populates conversation and/or lead owner deterministically.
3. Remove unsafe n8n fallback to `AgentFlow_Primary`; unknown or missing instance must fail closed.
4. Create a dedicated Libertalia channel row only after the Evolution instance strategy is approved.
5. Add/confirm principal/admin role semantics for agency-level management.
6. Add an operator queue filter or UI mode for “my assigned threads/leads/tasks” while preserving admin all-tenant view.
7. Add routing audit payload fields for instance, channel, tenant, resolved owner, and fallback reason.
8. Revalidate n8n retry/error handling for multi-instance operation.

### 8. What is safe to do now?

Safe now:

- Keep G03 marked `WAITING ON KOPANO`.
- Add docs and architecture evidence only.
- Prepare a small database/code migration plan for channel ownership.
- Prepare a controlled n8n change plan to fail closed on unknown/missing instance.
- Prepare, but do not execute, creation of `Libertalia_Kopano_Primary`.

### 9. What must not be done yet?

Do not yet:

- Create a Libertalia Evolution instance.
- Use `AgentFlow_Primary` for Libertalia.
- Generate or expose QR contents.
- Pair WhatsApp.
- Send WhatsApp test messages.
- Enable autonomous outbound transport.
- Execute Phase 11B.
- Mark G03/G04/G05/G06/G07/G08/G10/G12 as passed.

## 4. Architecture Capability Matrix

| Capability | Current result | Evidence / note |
|---|---:|---|
| Libertalia tenant exists | Supported today | Live org slug `libertalia-properties`, status active. |
| Multi-user membership | Supported today | `organization_members` model supports multiple users. |
| Principal/admin visibility | Supported today, broad | Owner/admin roles exist; tenant-wide selects are allowed. |
| Per-agent role semantics | Partial | Roles are `owner/admin/member`; no explicit `agent/operator/principal`. |
| Tenant branding | Supported today, limited | Logo/colors/name are tenant-specific; copy is not fully white-labeled. |
| Multiple Evolution channels | Supported structurally | `channels.external_channel_id` identifies instance; global uniqueness exists. |
| Libertalia channel exists | Not yet | Live evidence shows no active Libertalia channels. |
| Channel-to-tenant routing | Supported when configured | `ingest_inbound_message` resolves org from channel. |
| Channel-to-agent routing | Missing | No first-class owner/default assignee on channel; ingestion does not assign owner. |
| Per-agent inbox | Partial UI only | Owner displayed; no “my inbox only” enforcement/filter. |
| Agency-wide inbox | Supported today | Inbox queries by tenant organization. |
| Governed approvals | Supported today, outbound frozen | Draft review RPC + outbound gate exist. |
| Routing Audit Trail / Signal Orchestration | Partial | Automation/audit events exist; owner-resolution fields need strengthening. |
| 5–10 agent scale | Not certified | Needs owner mapping, UI filters, fail-closed routing, and operational playbook. |

## 5. Required Minimum Safe Change Set Before Instance Creation

1. **Channel ownership contract**
   - Preferred: add `owner_user_id uuid references profiles(id)` and/or `default_assignee_user_id uuid references profiles(id)` to `channels` with same-org trigger enforcement.
   - Acceptable short-term alternative: enforce `channels.metadata.default_assignee_user_id` with validation, but this is weaker than a first-class column.

2. **Ingestion assignment**
   - When an inbound message resolves a channel, assign new conversation and lead ownership from the channel owner/default assignee.
   - Emit automation event payload containing `channel_id`, `external_channel_id`, `resolved_owner_user_id`, `assignment_source`, and `fallback_reason`.

3. **n8n fail-closed routing**
   - Remove fallback to `AgentFlow_Primary` when instance identity is absent.
   - If instance is missing or no active channel row exists, return/drop safely and log error evidence instead of mutating tenant data.

4. **Libertalia channel row after approval**
   - Create channel row only after founder approves instance naming and owner mapping.
   - For Kopano-owned number: `external_channel_id='Libertalia_Kopano_Primary'`, provider `evolution`, channel type `whatsapp`, org Libertalia, owner/default assignee Kopano.

5. **UI/ops readiness**
   - Add operator “my queue” filtering or clearly document agency-wide visibility as intended for pilot.
   - Keep principal/admin all-tenant visibility.

## 6. Recommended Decision

**Do not create a client instance yet.**

Proceed only after the channel-owner routing gap and n8n fallback gap are fixed or explicitly accepted as a founder-approved temporary pilot limitation.
