# Phase 11A — Fail-Closed Routing Validation Report

**Timestamp:** 2026-06-20T00:57:09Z
**Scope:** Channel-owner mapping, Evolution inbound fail-closed behavior, outbound fallback removal, and non-execution safety constraints.
**Outcome:** **VALIDATION PASSED FOR FOUNDATION — LIVE LIBERTALIA INBOUND STILL NOT EXECUTED**

## 1. Required Test Case Results

| # | Required case | Result | Evidence |
|---:|---|---:|---|
| 1 | Known mapped instance → correct tenant and owner | PASSED | Rollback SQL validation `known_mapped`; conversation/lead default assignee propagation checked. |
| 2 | Unknown instance → quarantine/fail closed | PASSED | Rollback SQL validation `unknown`; returned `quarantined` / `unknown_evolution_instance`. |
| 3 | Disabled instance → quarantine/reject/fail closed | PASSED | Rollback SQL validation `disabled`; returned `rejected` / `channel_not_active`. |
| 4 | Mapped tenant but missing owner → quarantine/admin review | PASSED | Rollback SQL validation `missing_owner`; returned `quarantined` / `channel_owner_missing`. |
| 5 | Inactive owner → quarantine/admin review | PASSED | Rollback SQL validation `inactive_owner`; returned `quarantined` / `channel_owner_inactive_or_cross_tenant`. |
| 6 | `AgentFlow_Primary` inbound → Gen I Labs/internal only | PASSED | Case-insensitive non-internal channel insert blocked; RPC/outbound function also guard non-internal use. |
| 7 | Future `Libertalia_Kopano_Primary` mapping pattern → Libertalia/Kopano only | PASSED AS PATTERN, NOT SEEDED | Same deterministic channel registry validated with synthetic rollback channel. `Libertalia_Kopano_Primary` was not created/seeded. |
| 8 | Malformed instance field → reject/fail closed | PASSED | Rollback SQL validation `malformed`; returned `rejected` / `evolution_instance_malformed`. |
| 9 | Duplicate inbound message → dedupe correctly | PASSED | Rollback SQL validation `duplicate_dedupe`; duplicate external message count remained `1`. |
| 10 | Outbound without explicit instance/channel → fail closed | PASSED | `src/lib/evolution.ts` now requires `instance`; `send_outbound_message(...)` requires active Evolution channel external instance. |
| 11 | Outbound with `AgentFlow_Primary` from non-Gen I Labs tenant → fail closed | PASSED | DB outbound RPC and channel trigger block non-internal `AgentFlow_Primary`; app fallback removed. |
| 12 | No WhatsApp messages sent | PASSED | No Evolution send endpoint or outbound transport execution performed. |
| 13 | No QR pairing performed | PASSED | No QR/connect pairing action executed in this implementation. |
| 14 | Phase 11B not executed | PASSED | No Phase 11B inbound test messages sent or received. |

## 2. Database Validation

Completed:

- Migration dry-run transaction: passed.
- Migration apply: committed.
- Idempotent hardening reapply: committed.
- Rollback-only SQL functional validation: passed.

Validation script:

- `supabase/tests/phase11a_fail_closed_routing_validation.sql`

Key rollback-only cases passed:

```text
known_mapped
unknown
disabled
missing_owner
ambiguous_case_variant
inactive_owner
agentflow_primary_case_insensitive_lock
malformed
duplicate_dedupe
```

## 3. n8n Validation

Workflow:

- `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion`
- ID: `8QAshjrkLrNF5kDI`

Changes validated:

- Patch preview validation: passed.
- Patch applied: yes.
- Workflow validation: valid.
- Error count: 0.
- Warning count: 4 generic warnings for webhook response/error handling, code-node error handling, and Postgres retry/error handling.

Warnings remain as future hardening work, not a blocker for the narrow fail-closed foundation because the database RPC performs the authoritative safety decision and blocks unsafe mutation.

## 4. App Validation

Completed:

- `npm run lint`: passed with 22 existing warnings and 0 errors.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

## 5. Remaining Live-Evidence Gaps

Still not certified:

- Kopano final private password reset/login.
- Real Libertalia/Kopano production session evidence.
- Seeded `Libertalia_Kopano_Primary` channel row.
- QR pairing.
- Live WhatsApp inbound event proof.
- Phase 11B first inbound conversation.
- Full retry/error branch hardening in n8n.

## 6. Gate Outcome

This implementation can move G08/G10 from “unsafe fallback known” to “foundation implemented; live proof still required,” but it does not make G06/G07/G08/G10/G12 pass.

Phase 11A remains active and incomplete.

## 7. Final Pre-Commit Gates

Completed after report/doc updates:

- `git diff --check` on targeted changed files: passed.
- Targeted secret-pattern scan across intended commit files: passed.
- Source fallback check confirmed no app fallback to `AgentFlow_Primary`; remaining `AgentFlow_Primary` references are explicit safety locks/report evidence.
- Persistent SQL seed check confirmed no `Libertalia_Kopano_Primary` channel or Evolution instance was created/seeded.
