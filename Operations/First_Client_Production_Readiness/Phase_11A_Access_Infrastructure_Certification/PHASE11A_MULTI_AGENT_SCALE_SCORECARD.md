# Phase 11A — Libertalia Multi-Agent Scale Scorecard

**Timestamp:** 2026-06-20 UTC
**Scope:** 1 / 3 / 5 / 10 agent readiness for Libertalia Properties.
**Overall result:** **PARTIAL — agency workspace foundations are ready; per-agent channel routing must be fixed before scale.**

## 1. Scale Readiness Summary

| Scale | Current readiness | Supported today | Requires configuration only | Requires small code/schema change | Requires architecture change | Not currently supported |
|---:|---|---|---|---|---|---|
| 1 agent | Partial pilot-ready after fixes | Tenant, member, CRM, inbox, approvals, branding | Add dedicated instance/channel after approval | Channel owner/default assignee + n8n fail-closed | No | No |
| 3 agents | Partial | Multi-member org, shared agency inbox, lead/task ownership | Add members/channels/roles | Per-agent channel ownership, my-queue filters, owner assignment | No | No |
| 5 agents | Not certified | Tenant foundations | Add members/channels once owner mapping exists | Role semantics, routing audit fields, operational dashboards | Possibly for reporting/load ops | No |
| 10 agents | Not certified | Core schema likely handles records | Add members/channels only after fixes | Stronger role/queue/reporting + retry/error hardening | Likely team ops/reporting architecture | No proof yet |

## 2. 1-Agent Readiness — Kopano

**Status:** Partial.

Supported now:

- Libertalia tenant exists and is active.
- Kopano is an active tenant member.
- CRM lead owner, conversation owner, task assignee, approvals, audit logs, automation events, and branding structures exist.
- Canonical Evolution public route is remediated and protected.

Blocking gaps before creating/pairing first instance:

- No Libertalia Evolution instance exists.
- No Libertalia channel row exists.
- Channel-to-agent owner mapping is missing.
- n8n fallback to `AgentFlow_Primary` must be removed/fail-closed.
- G03 remains waiting on Kopano's private login confirmation.

Readiness decision: **Do not create instance yet.**

## 3. 3-Agent Readiness

**Status:** Partial.

Supported now:

- Organization membership can contain multiple users.
- Leads/tasks/conversations can reference different assigned users.
- Agency-wide inbox and pipeline visibility is tenant-scoped.
- Principal/admin visibility is achievable with owner/admin roles.

Needed before 3-agent operation:

- Add or enforce channel owner/default assignee per instance.
- Create one channel row per agent-owned instance.
- Add UI filters for “my inbox,” “my leads,” and “my tasks” or document agency-wide queue as intended.
- Define operational roles: principal/admin/operator.
- Add reassignment workflow and audit evidence for ownership transfers.

Readiness decision: **Configuration plus small code/schema fixes required.**

## 4. 5-Agent Readiness

**Status:** Not certified.

The foundation should support the data volume, but the operational model needs hardening.

Required before 5-agent rollout:

- Deterministic per-agent routing.
- Owner assignment from channel ingestion.
- Team/principal dashboard with per-agent counts.
- Explicit admin vs operator permissions.
- Audit events carrying instance, channel, tenant, owner, assignment source, and fallback reason.
- n8n retry/error behavior certified under multi-instance conditions.

Readiness decision: **Small code/schema fixes plus operational hardening required.**

## 5. 10-Agent Readiness

**Status:** Not certified.

At 10 agents, AgentFlow needs more than channel rows. It needs team operations controls.

Required before 10-agent rollout:

- All 5-agent requirements.
- Scalable channel registry and onboarding runbook.
- Per-agent reporting and stale queue monitoring.
- Principal/admin activity views.
- Queue ownership transfer and escalation rules.
- Load/error monitoring for n8n and Supabase ingestion.
- Strict unknown-instance fail-closed telemetry.

Readiness decision: **Architecture/operations hardening required before certification.**

## 6. Safe Next Technical Steps

1. Draft migration for `channels.owner_user_id` / `channels.default_assignee_user_id` or enforce equivalent metadata contract.
2. Update `ingest_inbound_message(...)` to set new conversation/lead owner from channel owner/default assignee.
3. Update n8n workflow to remove `AgentFlow_Primary` fallback and fail closed on unknown/missing instance.
4. Add routing audit payload fields for resolved tenant/channel/owner.
5. Add operator queue filters or document shared agency queue for pilot.
6. Re-run schema/source tests and n8n validation.
7. Only then request founder approval to create `Libertalia_Kopano_Primary`.

## 7. Final Scale Verdict

**MULTI-AGENT ARCHITECTURE PARTIAL — CONFIG/FIXES REQUIRED BEFORE INSTANCE CREATION**

The system is close enough for a controlled one-agent pilot after targeted routing fixes, but not certified for 5–10 agents yet.
