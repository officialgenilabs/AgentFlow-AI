# Phase 11A — Activation Gate Scorecard

**Timestamp:** 2026-06-19 UTC
**Mode:** Waiting-on-Kopano safe downstream precheck
**Overall Outcome:** **NOT READY FOR PHASE 11B EXECUTION**

## 1. Gate Scorecard

| Gate | Name | Current Status | Evidence | Notes |
|---|---|---:|---|---|
| G01 | Production baseline | PASSED | `PHASE11A_PRODUCTION_BASELINE_CERTIFICATION.md`, `evidence/g01_*` | Production domain/deployment baseline certified earlier. |
| G02 | Domain/auth callback | PASSED | `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md` | Supabase Auth URL/redirect config confirmed by founder evidence. |
| G03 | Kopano final reset + production login | WAITING ON KOPANO | `PHASE11A_KOPANO_ACCESS_RECOVERY_REPORT.md` | Kopano must privately reset and confirm login. No temp password may be created/used. |
| G04 | Libertalia tenant and permissions | NOT STARTED | Pending `PHASE11A_PERMISSION_MATRIX.md` | Requires Kopano final authenticated production session or supervised confirmation. |
| G05 | Desktop/mobile operator access | NOT STARTED | Pending | Requires Kopano final login/session evidence. |
| G06 | Evolution API + WhatsApp instance | REVALIDATION REQUIRED | `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md`; `evidence/g06_evolution_503_remediation_20260619.txt` | Canonical `flows.genilabs.co.za/evolution` route remediated and healthy with API-key guard; no Libertalia-named instance confirmed; legacy `agentflow.duckdns.org/evolution` remains stale/503. |
| G07 | WhatsApp pairing | NOT STARTED | `PHASE11A_WHATSAPP_PAIRING_REPORT.md` | No pairing attempted; QR/connect endpoint is reachable for `AgentFlow_Primary`, but correct Libertalia instance/account confirmation is still required. |
| G08 | n8n/webhook certification | REVALIDATION REQUIRED | `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md`; `evidence/g06_evolution_503_remediation_20260619.txt` | Evolution webhook config is readable and internal n8n is reachable; live webhook proof still depends on correct instance/channel mapping, QR pairing, and explicit error/retry hardening. |
| G09 | Email/Property24 forwarding readiness | REVALIDATION REQUIRED | `PHASE11A_EMAIL_READINESS_REPORT.md` | Route guard works; mailbox/parser bridge and signed sample still required. |
| G10 | Full inbound pipeline readiness | REVALIDATION REQUIRED | This scorecard | Cannot pass without G03/G04/G05, correct instance/channel mapping, G07/G08/G09 live evidence, and Phase 11B controlled inbound proof. |
| G11 | Phase 11B test-plan preparation | PREPARED | `PHASE11B_FIRST_INBOUND_TEST_PLAN.md` | Plan prepared only; not executed. |
| G12 | Final Phase 11A certification | NOT STARTED | Pending final reconciliation | Cannot pass until all required upstream gates pass. |

## 2. Safe Precheck Work Completed

Completed while G03 remained waiting:

1. Entered safe-precheck mode in master plan and state ledger.
2. Checked Evolution public route, local container, and local port binding.
3. Confirmed public Evolution route blocker (`503 no available server`).
4. Inspected active n8n Evolution inbound workflow.
5. Validated n8n workflow structure: valid with warnings.
6. Inspected canonical ingestion tables/functions/indexes/triggers.
7. Confirmed no active Libertalia Evolution channel mapping exists yet.
8. Checked Property24 production route guard with unsigned request only.
9. Confirmed observability tables exist and n8n saves error executions.
10. Prepared Phase 11B three-message test plan without execution.

## 3. Critical Blockers

### B1 — G03 waiting on Kopano

Kopano has not yet completed final private password reset and production login confirmation.

### B2 — Evolution public route drift remediated

The Evolution API container is healthy locally. The canonical active route `https://flows.genilabs.co.za/evolution/` is now guarded and healthy. The legacy `https://agentflow.duckdns.org/evolution/` route remains stale/503 and should not be treated as the canonical production endpoint unless founder explicitly chooses to restore that old host.

### B3 — Libertalia Evolution instance/channel mapping unresolved

Only `AgentFlow_Primary` is visible and open in Evolution. No Libertalia-named Evolution instance is visible, and prior DB inspection found no active Libertalia Evolution channel row. Founder must confirm approved pilot instance strategy before QR pairing.

### B4 — n8n error/retry hardening gap

The active workflow validates, but warnings remain for webhook response/error handling, Code node error behavior, and Postgres retry/error handling.

### B5 — Property24 parser/forwarding not configured/proven

The signed app endpoint is live and guarded, but mailbox forwarding, parser bridge, and signed sample ingestion are not yet certified.

## 4. Go / No-Go

**No-Go for Phase 11B execution.**

Phase 11B can only begin after:

1. Kopano confirms private production login.
2. Libertalia tenant permissions are certified from real Kopano access.
3. Evolution public route and instance/channel mapping are fixed.
4. WhatsApp is paired by founder scan.
5. n8n/webhook/live inbound path is revalidated.
6. Founder explicitly authorizes the three-message Phase 11B test.
