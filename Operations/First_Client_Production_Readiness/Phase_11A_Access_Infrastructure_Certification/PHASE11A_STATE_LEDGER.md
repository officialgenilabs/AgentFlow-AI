# Phase 11A State Ledger — Access & Infrastructure Certification

**Created:** 2026-06-19 UTC  
**Authoritative plan:** `PHASE11A_MASTER_EXECUTION_PLAN.md`  
**Allowed statuses:** `NOT STARTED`, `IN PROGRESS`, `WAITING ON FOUNDER`, `WAITING ON KOPANO`, `BLOCKED`, `FAILED`, `PASSED`, `REVALIDATION REQUIRED`

| Gate ID | Gate name | Status | Owner | Dependency | Last verified timestamp | Evidence reference | Blocker | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G01 | Production baseline certification | PASSED | Nova | Durable plan baseline | 2026-06-19T08:42Z | `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md`; `evidence/g01_git_baseline.txt`; `evidence/g01_vercel_project_summary.json`; `evidence/g01_runtime_governance_checks.txt` | None blocking. Non-blocking risk: Vercel Git-link productionBranch reports `develop` while actual production deployment ref is release branch | Continue G02 domain/DNS/SSL/auth callback certification |
| G02 | Domain, DNS, SSL and auth callbacks | IN PROGRESS | Nova | G01 PASSED | 2026-06-19T08:42Z initial domain/alias discovery | `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md`; `evidence/g01_vercel_project_summary.json` | Supabase Site URL/redirect URL verification still pending | Verify DNS/SSL/canonical redirects/auth callbacks/password reset/invitation/login/logout/mobile redirect behavior |
| G03 | Kopano final reset and production login | NOT STARTED | Nova + Kopano | G02 PASSED | Temporary validation only: 2026-06-19T07:34Z | Prior temp evidence: `../Phase11A_Auth_Recovery_Validation/PHASE11A_AUTH_RECOVERY_VALIDATION_REPORT_2026-06-19.md`; pending: `PHASE11A_KOPANO_ACCESS_RECOVERY_REPORT.md` | Kopano final reset not yet confirmed | Confirm eligibility and recovery redirect, then issue exact Kopano reset checkpoint |
| G04 | Libertalia tenant and permission certification | NOT STARTED | Nova | G03 PASSED | Temporary credential RLS only: 2026-06-19T07:34Z | Pending: `PHASE11A_PERMISSION_MATRIX.md` | Requires Kopano final production login evidence | Validate backend and frontend access with Kopano actual production role |
| G05 | Desktop and mobile operator access | NOT STARTED | Nova + Kopano/Founder | G04 PASSED | Not yet verified | Pending access evidence | Requires Kopano actual role/session or supervised confirmation | Certify desktop/mobile login, persistence, navigation, logout, reauth |
| G06 | Evolution API and WhatsApp instance certification | NOT STARTED | Nova | G01/G02 context | Not yet verified | Pending: `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md` | None yet | Verify Evolution health, Libertalia instance, isolation, QR readiness, webhook config, no outbound |
| G07 | WhatsApp QR pairing | NOT STARTED | Nova + Founder | G06 PASSED | Not yet verified | Pending: `PHASE11A_WHATSAPP_PAIRING_REPORT.md` | Requires confirmed instance and founder scan | Generate QR only after G06, then wait for founder scan and verify connected state |
| G08 | n8n and webhook certification | NOT STARTED | Nova | G06, and G07 where live state required | Not yet verified | Pending: `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md` | G06 incomplete | Verify workflows, webhook auth, mappings, retries, idempotency, observability, no autonomous outbound |
| G09 | Email-forwarding readiness | NOT STARTED | Nova + Founder/Kopano if mailbox action needed | G01/G02 | Not yet verified | Pending: `PHASE11A_EMAIL_READINESS_REPORT.md` | External mailbox details may be required | Discover forwarding source/destination/endpoint/security/parser and exact human setup if required |
| G10 | Inbound pipeline readiness | NOT STARTED | Nova | G06/G08/G09 readiness | Not yet verified | Pending: `PHASE11A_ACTIVATION_GATE_SCORECARD.md` | Infrastructure gates incomplete | Verify component readiness without sending Phase 11B messages |
| G11 | Phase 11B first inbound test preparation | NOT STARTED | Nova | G10 PASSED | Not yet prepared | Pending: `PHASE11B_FIRST_INBOUND_TEST_PLAN.md` | G10 incomplete | Prepare exact three-message controlled test protocol; do not execute |
| G12 | Final Phase 11A certification | NOT STARTED | Nova | G01-G11 PASSED | Not yet certified | Pending final scorecard and all reports | All gates incomplete | Reconcile reports, run secret/diff checks, commit/push final docs, provide final allowed outcome |

## Prior Evidence Reconciliation Log

| Claimed item | Supporting evidence | Production? | Verified timestamp | Identity/role used | Temporary vs permanent | Certification decision |
| --- | --- | --- | --- | --- | --- | --- |
| Temporary validation credential works | `../Phase11A_Auth_Recovery_Validation/evidence/phase11a_live_validation.txt` | Yes, production app + canonical Supabase project | 2026-06-19T07:34:39Z | Kopano account using temporary validation credential | Temporary | Evidence accepted for history only; not enough for G03 final reset |
| Recovery/reset surfaces deployed | `../Phase11A_Auth_Recovery_Validation/evidence/phase11a_live_validation.txt` | Yes | 2026-06-19T07:34:39Z | Temporary authenticated session plus unauthenticated route checks | Temporary/session-based | Revalidation required under G02/G03 |
| Libertalia dashboard/leads access with Kopano account | `../Phase11A_Auth_Recovery_Validation/evidence/phase11a_live_validation.txt` | Yes | 2026-06-19T07:34:39Z | Kopano account using temporary validation credential | Temporary | Evidence accepted for history only; not enough for G04/G05 after final reset |
| Phase 11A complete | Prior chat response only | N/A | N/A | N/A | N/A | Rejected. Phase 11A is not complete until G01-G12 all PASSED |
