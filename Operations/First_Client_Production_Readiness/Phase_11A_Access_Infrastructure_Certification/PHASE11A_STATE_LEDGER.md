# Phase 11A State Ledger — Access & Infrastructure Certification

**Created:** 2026-06-19 UTC
**Authoritative plan:** `PHASE11A_MASTER_EXECUTION_PLAN.md`
**Allowed statuses:** `NOT STARTED`, `IN PROGRESS`, `WAITING ON FOUNDER`, `WAITING ON KOPANO`, `BLOCKED`, `FAILED`, `PASSED`, `REVALIDATION REQUIRED`, `PREPARED`

| Gate ID | Gate name | Status | Owner | Dependency | Last verified timestamp | Evidence reference | Blocker | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G01 | Production baseline certification | PASSED | Nova | Durable plan baseline | 2026-06-19T08:42Z | `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md`; `evidence/g01_git_baseline.txt`; `evidence/g01_vercel_project_summary.json`; `evidence/g01_runtime_governance_checks.txt` | None blocking. Non-blocking risk: Vercel Git-link productionBranch reports `develop` while actual production deployment ref is release branch | Continue G02 domain/DNS/SSL/auth callback certification |
| G02 | Domain, DNS, SSL and auth callbacks | PASSED | Nova + Founder/Supabase admin | G01 PASSED | 2026-06-19T08:56Z | `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md`; `evidence/g02_domain_dns_ssl_runtime_checks.txt`; `evidence/g02_supabase_redirect_probe.txt`; `evidence/g02_live_client_bundle_env_alignment.txt`; `evidence/g03_recovery_email_request.txt` | None blocking. Founder verified Supabase Site URL and production redirects; runtime/canonical recovery request evidence supports canonical path | Proceeded to G03 Kopano final reset |
| G03 | Kopano final reset and production login | WAITING ON KOPANO | Nova + Kopano | G02 PASSED | 2026-06-19T08:56Z | `PHASE11A_KOPANO_ACCESS_RECOVERY_REPORT.md`; `evidence/g03_kopano_precheck.txt`; `evidence/g03_recovery_email_request.txt` | Kopano must complete final password reset and production login privately | Kopano opens recovery email, sets final password, logs in at `https://app.genilabs.co.za/login`, then confirms completion without sharing password/reset link |
| G04 | Libertalia tenant and permission certification | NOT STARTED | Nova | G03 PASSED | Temporary credential RLS only: 2026-06-19T07:34Z | Pending: `PHASE11A_PERMISSION_MATRIX.md` | Requires Kopano final production login evidence | Validate backend and frontend access with Kopano actual production role |
| G05 | Desktop and mobile operator access | NOT STARTED | Nova + Kopano/Founder | G04 PASSED | Not yet verified | Pending access evidence | Requires Kopano actual role/session or supervised confirmation | Certify desktop/mobile login, persistence, navigation, logout, reauth |
| G06 | Evolution API and WhatsApp instance certification | REVALIDATION REQUIRED | Nova | G01/G02 context; independent of G03 final login for remediation/precheck only | 2026-06-19T23:23Z canonical route remediated | `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md`; `PHASE11A_WHATSAPP_PAIRING_REPORT.md`; `evidence/g06_evolution_503_remediation_20260619.txt`; prior `evidence/g06_*` | Canonical `https://flows.genilabs.co.za/evolution/` is healthy with API-key guard, but legacy `agentflow.duckdns.org/evolution` remains stale/503 and no Libertalia-named Evolution instance is visible; `AgentFlow_Primary` is open but not yet explicitly certified as the Libertalia instance | Founder must confirm dedicated Libertalia instance vs approved `AgentFlow_Primary` pilot use; verify tenant channel mapping before QR pairing |
| G07 | WhatsApp QR pairing | REVALIDATION REQUIRED | Nova + Founder | G06 PASSED | 2026-06-19T23:23Z QR endpoint reachable on `AgentFlow_Primary`, no pairing | `PHASE11A_WHATSAPP_PAIRING_REPORT.md`; `evidence/g06_evolution_503_remediation_20260619.txt` | QR/connect endpoint is reachable and returns `state=open` for `AgentFlow_Primary`, but no QR pairing was attempted and the Libertalia-specific instance decision remains unresolved | Generate/display QR only after founder confirms the correct instance/account and is present to scan |
| G08 | n8n and webhook certification | REVALIDATION REQUIRED | Nova | G06; live-event assertions remain dependent on G07/Phase 11B | 2026-06-19T23:23Z webhook route precheck refreshed | `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md`; `evidence/g06_evolution_503_remediation_20260619.txt`; `evidence/g08_g10_supabase_ingestion_schema_precheck.txt`; `evidence/g08_ingest_rpc_summary.txt`; `evidence/g08_intake_rpc_summary.txt`; `evidence/g08_g10_observability_retry_error_precheck.txt`; `evidence/g10_outbound_surface_source_check.txt` | Evolution webhook config is readable and points to internal n8n `MESSAGES_UPSERT`, and Docker-internal n8n is reachable; live WhatsApp event evidence is still unavailable; workflow retry/error warnings and Libertalia channel mapping remain | Revalidate live webhook event mapping only after correct instance/channel mapping and QR pairing |
| G09 | Email-forwarding readiness | REVALIDATION REQUIRED | Nova + Founder/Kopano/mailbox admin if action needed | G01/G02 | 2026-06-19T09:14Z precheck completed | `PHASE11A_EMAIL_READINESS_REPORT.md`; `evidence/g09_email_infra_source_doc_search.txt`; `evidence/g09_property24_production_guard_check.txt` | Production route guard works, but Property24 source mailbox, forwarding destination/parser bridge, and signed sample remain unverified | Founder/Kopano/mailbox admin to provide Property24 lead delivery details and sample; then run signed bridge test only when authorized |
| G10 | Inbound pipeline readiness | REVALIDATION REQUIRED | Nova | G06/G08/G09 readiness plus G07 live pairing and Phase 11B evidence | 2026-06-19T09:14Z scorecard prepared | `PHASE11A_ACTIVATION_GATE_SCORECARD.md` | Full inbound readiness cannot pass without Kopano login, live pairing, Libertalia channel mapping, and Phase 11B real production evidence | Resume at G03 confirmation, then re-run G04-G10 in order; do not send Phase 11B messages yet |
| G11 | Phase 11B first inbound test preparation | PREPARED | Nova | Can be prepared while G10 remains revalidation-required | 2026-06-19T09:14Z plan prepared | `PHASE11B_FIRST_INBOUND_TEST_PLAN.md` | Execution not authorized; upstream gates incomplete | Execute only after G03-G10 pass and founder explicitly authorizes sender/window/content |
| G12 | Final Phase 11A certification | NOT STARTED | Nova | G01-G11 PASSED | Not yet certified | Pending final scorecard and all reports | All gates incomplete | Reconcile reports, run secret/diff checks, commit/push final docs, provide final allowed outcome |

## Prior Evidence Reconciliation Log

| Claimed item | Supporting evidence | Production? | Verified timestamp | Identity/role used | Temporary vs permanent | Certification decision |
| --- | --- | --- | --- | --- | --- | --- |
| Temporary validation credential works | `../Phase11A_Auth_Recovery_Validation/evidence/phase11a_live_validation.txt` | Yes, production app + canonical Supabase project | 2026-06-19T07:34:39Z | Kopano account using temporary validation credential | Temporary | Evidence accepted for history only; not enough for G03 final reset |
| Recovery/reset surfaces deployed | `../Phase11A_Auth_Recovery_Validation/evidence/phase11a_live_validation.txt` | Yes | 2026-06-19T07:34:39Z | Temporary authenticated session plus unauthenticated route checks | Temporary/session-based | Revalidation required under G02/G03 |
| Libertalia dashboard/leads access with Kopano account | `../Phase11A_Auth_Recovery_Validation/evidence/phase11a_live_validation.txt` | Yes | 2026-06-19T07:34:39Z | Kopano account using temporary validation credential | Temporary | Evidence accepted for history only; not enough for G04/G05 after final reset |
| Phase 11A complete | Prior chat response only | N/A | N/A | N/A | N/A | Rejected. Phase 11A is not complete until G01-G12 all PASSED |

## 2026-06-19 Safe Downstream Precheck Summary

- Entered waiting-on-Kopano safe-precheck mode in commit `9a1abf3`.
- Earlier safe precheck found Evolution local container healthy while the public `/evolution/` route returned `503 no available server`; later 23:23Z remediation recovered the canonical `flows.genilabs.co.za/evolution` route, with remaining instance/channel revalidation required.
- No QR contents were exposed and no WhatsApp pairing was attempted.
- Active n8n Evolution inbound workflow `8QAshjrkLrNF5kDI` validates with warnings; retry/error-handling hardening remains required.
- Supabase ingestion tables/indexes/RPCs exist, but no active `libertalia-properties` Evolution channel row was found; tenant attribution must be fixed before live inbound.
- Property24 route guard is live: unsigned production POST returned `401 signed_ingress_required`; no mutation attempted.
- Property24 forwarding/parser bridge remains unverified pending founder/Kopano/mailbox admin details and sample email.
- Phase 11B three-message plan is prepared only and not executed.
## 2026-06-19 G06 Evolution 503 Remediation Start

- 2026-06-19T23:09Z: Founder authorized narrow G06 remediation for the public Evolution route returning `503 no available server`.
- Scope constrained to Evolution API availability, container/process health, local port, nginx/reverse proxy/upstream, firewall/local network accessibility, environment alignment, Libertalia instance visibility, webhook reachability, and QR readiness without exposing QR contents.
- Explicit prohibitions remain: no Kopano temporary password, no QR pairing, no WhatsApp sends, no autonomous outbound enablement, no Phase 11B execution.
## 2026-06-19 G06 Evolution 503 Remediation Result

- Root cause: Evolution itself was healthy on local `127.0.0.1:8080`, but the active public route was misaligned: legacy `agentflow.duckdns.org/evolution` resolves to the old public host and still returns `503`, while the canonical active host `flows.genilabs.co.za` had no `/evolution/` nginx location and fell through to n8n HTML before remediation.
- Action taken: added guarded nginx `/evolution/` route on `flows.genilabs.co.za` proxying to local Evolution `127.0.0.1:8080`, with API-key header enforcement via a root-only include; `/usr/sbin/nginx -t` passed and nginx was reloaded.
- Current status: canonical `https://flows.genilabs.co.za/evolution/` returns `401` without API key and `200` with API key; local Evolution remains healthy; n8n root/webhook path still respond as expected.
- Instance status: only `AgentFlow_Primary` is visible and open; no Libertalia-named Evolution instance is visible. Treat the instance strategy/channel mapping as unresolved before QR pairing.
- QR status: `/instance/connect/AgentFlow_Primary` is reachable and returns `state=open`; no QR content was exposed and no pairing was attempted.
- Outbound safety: no send/logout/delete endpoints were called; no WhatsApp messages were sent; no outbound automation or app env changed.
## 2026-06-19 Libertalia Multi-Agent Architecture Checkpoint Start

- 2026-06-19T23:52Z: Founder directed Nova to pause before creating any dedicated Libertalia Evolution instance and certify multi-agent / multi-channel readiness first.
- Scope: tenant model, user/role model, branding model, channel/Evolution instance model, inbound routing, multi-agent operations, security/isolation, scaling readiness, and instance naming recommendation.
- Explicit prohibitions remain: do not create an Evolution instance, do not pair QR, do not send WhatsApp messages, do not enable outbound, do not execute Phase 11B, do not mark G03/G04/G05/G07/G10 passed without required real evidence.
- New required reports: `PHASE11A_LIBERTALIA_MULTI_AGENT_ARCHITECTURE_REPORT.md`, `PHASE11A_CHANNEL_OWNERSHIP_MAPPING_REPORT.md`, `PHASE11A_TENANT_BRANDING_READINESS_REPORT.md`, `PHASE11A_MULTI_AGENT_SCALE_SCORECARD.md`.

## 2026-06-20 Libertalia Multi-Agent Architecture Checkpoint Result

- Architecture outcome: **MULTI-AGENT ARCHITECTURE PARTIAL — CONFIG/FIXES REQUIRED BEFORE INSTANCE CREATION**.
- Reports created:
  - `PHASE11A_LIBERTALIA_MULTI_AGENT_ARCHITECTURE_REPORT.md`
  - `PHASE11A_CHANNEL_OWNERSHIP_MAPPING_REPORT.md`
  - `PHASE11A_TENANT_BRANDING_READINESS_REPORT.md`
  - `PHASE11A_MULTI_AGENT_SCALE_SCORECARD.md`
- Evidence created/used:
  - `evidence/g06_g10_multi_agent_architecture_source_evidence_20260619.txt`
  - `evidence/g06_g10_multi_agent_live_schema_evidence_20260619.txt`
  - `evidence/g06_g10_multi_agent_architecture_followup_evidence_20260619.txt`
  - `evidence/g08_n8n_multi_agent_routing_checkpoint_20260620.md`
- Certified foundations: Libertalia tenant exists, multi-user membership model exists, tenant branding exists, tenant-scoped inbox/leads/tasks/approvals/audit surfaces exist, and Evolution instance-to-channel-to-tenant routing is structurally supported when a correct active channel row exists.
- Not certified: per-agent Evolution/WhatsApp ownership, deterministic channel-to-agent assignment, safe unknown-instance behavior, live Libertalia channel row, QR pairing, and Phase 11B inbound proof.
- Key blocker: `channels` does not have a first-class owner/default assignee column, and current ingestion does not assign conversation/lead owner from channel ownership. n8n also currently falls back to `AgentFlow_Primary` if instance identity is missing.
- Instance naming recommendation: use `Libertalia_Kopano_Primary` only if the first number is Kopano-owned; use `Libertalia_Agency_Primary` only for a shared agency/principal number. Current intended per-agent model favors `Libertalia_Kopano_Primary` after routing fixes.
- Safe next action: prepare a narrow channel-owner / fail-closed routing fix plan. Do not create the instance until founder approval follows this checkpoint.
- Gate impact: G06/G08/G10 remain `REVALIDATION REQUIRED`; G07 remains not executed; G03 remains `WAITING ON KOPANO`; Phase 11B remains prepared only.
