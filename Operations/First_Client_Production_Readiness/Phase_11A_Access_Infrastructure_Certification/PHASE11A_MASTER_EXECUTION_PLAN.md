# Phase 11A — Access & Infrastructure Certification Master Execution Plan

**Phase:** 11A — Access & Infrastructure Certification
**Authoritative record:** GitHub repository `officialgenilabs/AgentFlow-AI` / local repo `/opt/agentflow_memory/nova/agentflow-ai`
**Created:** 2026-06-19 UTC
**Current active gate:** G03 — Kopano Final Reset and Production Login
**Current final outcome:** Not certified. Phase 11A remains active until every required gate is `PASSED` in `PHASE11A_STATE_LEDGER.md`.

## 1. Phase Objective

Certify, with production evidence, that Kopano Nkotsi can safely access the AgentFlow AI production application for the Libertalia Properties tenant and that the connected infrastructure required for the first inbound certification is ready without enabling autonomous outbound behavior.

Phase 11A is complete only when every gate in this plan is `PASSED`. Temporary validation, founder-only validation, source inspection alone, or QR generation alone are not sufficient final certification.

## 2. Current Production Baseline

This baseline must be verified during G01 before it becomes accepted production truth.

| Item | Current known / expected value | Certification status |
| --- | --- | --- |
| Product repository | `officialgenilabs/AgentFlow-AI` / local `agentflow-ai` | VERIFIED G01 |
| Production branch | `release/agentflow-v2-production` actual production deployment ref; Vercel Git-link productionBranch reports `develop` | VERIFIED G01 WITH RISK |
| Local/GitHub HEAD after baseline commit | `c137baa` (`Add Phase 11A execution baseline`); production app source commit `7616563` | VERIFIED G01 — docs-only branch drift |
| Historical Phase 10B deployment commit | `847f2b2` | VERIFIED G01 — ancestor of production source commit |
| Historical Phase 10B rollback reference | `50cdaf4` | VERIFIED G01 — valid commit and recent deployment |
| Intended canonical domain | `https://app.genilabs.co.za` | VERIFIED G01 as assigned production alias; G02 deeper domain/auth checks in progress |
| Prior temporary auth validation report | `Operations/First_Client_Production_Readiness/Phase11A_Auth_Recovery_Validation/PHASE11A_AUTH_RECOVERY_VALIDATION_REPORT_2026-06-19.md` | Evidence exists, not final certification |
| Phase 11A durable plan location | `Operations/First_Client_Production_Readiness/Phase_11A_Access_Infrastructure_Certification/` | This file |

## 3. Scope

Phase 11A includes:

1. Production baseline certification.
2. Production domain, DNS, SSL, and authentication callback certification.
3. Kopano final credential recovery readiness and completion validation.
4. Kopano production login validation using Kopano's own account after final reset.
5. Libertalia tenant and least-privilege permission certification.
6. Desktop and mobile operator access validation.
7. Evolution API and WhatsApp instance certification.
8. WhatsApp QR pairing and session validation.
9. n8n workflow and webhook certification.
10. Email-forwarding readiness.
11. Inbound pipeline readiness without executing the Phase 11B conversation.
12. Phase 11B first inbound test preparation.
13. Final evidence-backed Phase 11A certification.

## 4. Exclusions / Prohibited Work

Do not begin or perform:

- Dashboard Option C.
- Broad mobile redesign.
- New dashboards.
- New AI scoring or unrelated intelligence features.
- Autonomous outbound activation.
- Unrelated integrations.
- Phase 11B message execution.
- Destructive database changes without founder approval.
- Security-policy relaxation without founder approval.
- Credential rotation beyond the already-approved temporary validation unless explicitly authorized.

## 5. Operating Rules

### Plan Continuity Protocol

At the start of every Phase 11A continuation:

1. Open this master execution plan.
2. Open `PHASE11A_STATE_LEDGER.md`.
3. Read latest Phase 11A reports and relevant Phase 10B deployment evidence.
4. Confirm current Git commit and production deployment.
5. Identify the first gate that is not `PASSED`.
6. State the current gate and next action before proceeding.

Before significant action:

- Reference the relevant gate.
- Confirm its acceptance criteria.
- Confirm action is within scope.

After every action:

- Record result.
- Link or describe evidence.
- Update gate status.
- Record next action.
- Record new risk or blocker.

After every human checkpoint:

- Reopen this plan and the state ledger.
- Confirm checkpoint outcome.
- Resume from the next incomplete gate.

### Secrets and Privacy

Reports must not contain:

- Passwords.
- API keys.
- Access tokens.
- Recovery links.
- QR contents.
- Webhook secrets.
- Private message payloads.
- Client phone numbers unless explicitly approved and necessary.

## 6. Gate Sequence, Dependencies, Acceptance Criteria, Actions, Evidence, Rollback

### G01 — Production Baseline Certification

**Depends on:** Durable plan baseline committed.
**Acceptance criteria:**

- Production repository, branch, current commit, Vercel deployment, canonical domain, and rollback reference verified.
- Phase 10B remains active in deployed lineage.
- Governance remains intact.
- Outbound automation remains frozen.
- No unexplained production drift.
- Working tree condition documented.

**Technical actions:**

- Inspect Git branch, local HEAD, remote status, and working tree.
- Inspect Vercel production deployment and alias assignment without exposing tokens.
- Verify `https://app.genilabs.co.za` routes and deployed behavior.
- Verify outbound gate environment/status without exposing values.

**Evidence required:**

- `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md` or dedicated G01 evidence file.
- Deployment URL/alias metadata with secrets redacted.
- Route checks.
- Git evidence.

**Rollback requirements:**

- Confirm previous safe deployment/commit reference.
- Document rollback command/procedure without executing unless needed.

### G02 — Domain, DNS, SSL and Auth Callback Certification

**Depends on:** G01.
**Acceptance criteria:**

- Every active production and preview domain discovered and classified.
- Canonical domain routing, DNS, SSL, Vercel alias, production deployment association verified.
- Stale/unintended aliases identified.
- Supabase Site URL and redirect URLs verified without exposing secrets.
- Auth callbacks, password reset, invitation, login, logout, middleware, and mobile redirect behavior verified.
- Auth links do not redirect to localhost, stale previews, obsolete aliases, wrong tenants, or unauthorized domains.

**Technical actions:**

- Query Vercel project/domain/deployment metadata using stored token safely.
- Fetch DNS/SSL metadata.
- Inspect Supabase auth config via safe supported method if available; otherwise record exact blocker.
- Runtime route checks for login, callback guard, forgot/reset, logout, middleware redirect.

**Evidence required:**

- `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md`.
- Sanitized Vercel domain/deployment summary.
- Sanitized auth redirect findings.

**Rollback requirements:**

- Document Vercel alias rollback target.
- Document auth redirect setting rollback if modified.

### G03 — Kopano Final Reset and Production Login

**Depends on:** G02.
**Acceptance criteria:**

- Approved Kopano identity confirmed: `kopano@libertaliaproperties.co.za`.
- Supabase user, confirmation status, membership, and role confirmed.
- Recovery redirect destination verified.
- Kopano completes final password reset through the approved recovery path.
- Kopano successfully authenticates to production using Kopano's own account.
- Founder login and temporary credential validation are not substitute evidence.

**Human checkpoint:**

- Owner: Kopano, coordinated by Founder.
- Kopano must open `https://app.genilabs.co.za/forgot-password`, request password recovery for his approved mailbox, use only the email sent to his mailbox, set his own password, and confirm successful login.
- Kopano must not share the password or reset link.
- Founder/Kopano confirmation should state only: `Kopano final reset complete and production login succeeded`.

**Technical actions:**

- Confirm user/membership/reset eligibility before instruction.
- After confirmation, validate production access through safe non-secret evidence or supervised confirmation.

**Evidence required:**

- `PHASE11A_KOPANO_ACCESS_RECOVERY_REPORT.md`.
- Sanitized auth/user/membership checks.
- Human confirmation record.
- Production login validation record.

**Rollback requirements:**

- If final reset fails, do not set a new password for Kopano without explicit founder authorization.
- Document recovery resend path and blocker.

### G04 — Libertalia Tenant and Permission Certification

**Depends on:** G03.
**Acceptance criteria:**

- Kopano has membership in correct Libertalia tenant.
- Intended operator role is active.
- Least-privilege permissions verified.
- No founder-only access.
- No unrelated tenant access.
- No cross-tenant data visibility.
- Backend authorization and frontend behavior verified.
- Required surfaces certified: Dashboard, Inbox, Leads, Approvals, Hot Leads, Viewing Ready, relevant operational evidence.

**Technical actions:**

- Backend RLS checks using Kopano role/session where safe.
- Frontend route checks or supervised session evidence.
- Build permission matrix expected vs observed.

**Evidence required:**

- `PHASE11A_PERMISSION_MATRIX.md`.

**Rollback requirements:**

- If role mapping is wrong, smallest safe tenant membership correction with validation.

### G05 — Desktop and Mobile Operator Access

**Depends on:** G04.
**Acceptance criteria:**

- Desktop login certified.
- Mobile login certified.
- Session persistence certified.
- Tenant landing behavior certified.
- Sidebar/navigation access certified.
- Inbox, Approval, Hot Leads, Viewing Ready access certified.
- Logout and reauthentication certified.

**Technical actions:**

- Use Kopano's actual production role.
- Where direct auth cannot be automated safely, use supervised/human confirmation and record as such.
- Fix only P0/P1 blockers.

**Evidence required:**

- Access validation section in `PHASE11A_PERMISSION_MATRIX.md` or separate evidence file.

**Rollback requirements:**

- Code/UI fixes require lint/type/build/diff checks and production deploy validation.

### G06 — Evolution API and WhatsApp Instance Certification

**Depends on:** G01/G02 for environment context.
**Acceptance criteria:**

- Evolution API service health verified.
- Production endpoint verified.
- Correct Libertalia instance identified.
- Instance isolation verified.
- Connection state and QR-generation readiness verified.
- Webhook config and required subscriptions verified.
- Session persistence/reconnection/failure visibility verified.
- No unintended outbound activity.

**Evidence required:**

- `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md`.

**Rollback requirements:**

- Restore previous instance/webhook config if changed.

### G07 — WhatsApp QR Pairing

**Depends on:** G06.
**Acceptance criteria:**

- QR generated for confirmed Libertalia instance only.
- Founder receives one exact scanning instruction.
- Gate marked `WAITING ON FOUNDER` while awaiting scan.
- After scan, connected state verified.
- Intended authorized account verified without exposing phone number.
- Session persistence verified.
- No unintended outbound sent.

**Human checkpoint:** Founder scans QR using the approved Libertalia WhatsApp account/device.

**Evidence required:**

- `PHASE11A_WHATSAPP_PAIRING_REPORT.md`.

**Rollback requirements:**

- Disconnect/revoke pairing only with founder approval unless security incident.

### G08 — n8n and Webhook Certification

**Depends on:** G06; G07 for live WhatsApp connected-state checks where required.
**Acceptance criteria:**

- Correct production workflows and active/inactive states verified.
- Webhook URL and authentication verified.
- Evolution event mapping verified.
- Inbound normalization, tenant attribution, conversation lookup/creation, message threading, lead creation, dedupe, qualification trigger, approval trigger, Signal Orchestration event, Routing Audit Trail, retries, idempotency, error handling, observability verified.
- Active workflow version identified.
- Autonomous outbound remains disabled.

**Evidence required:**

- `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md`.

**Rollback requirements:**

- Workflow version/export snapshot before changes.
- Disable modified workflow if validation fails.

### G09 — Email-Forwarding Readiness

**Depends on:** G01/G02; external mailbox details may require human checkpoint.
**Acceptance criteria:**

- Libertalia source mailbox/forwarding source identified.
- Approved forwarding destination identified.
- Email ingestion endpoint, auth/security, parser, tenant attribution, dedupe, conversation/lead creation path, error handling, privacy considerations documented.
- If external mailbox admin action remains, gate is `WAITING ON FOUNDER` or `WAITING ON KOPANO`, not `PASSED`.

**Evidence required:**

- `PHASE11A_EMAIL_READINESS_REPORT.md`.

**Rollback requirements:**

- Disable forwarding/endpoint mapping if incorrect.

### G10 — Inbound Pipeline Readiness

**Depends on:** G06, G08, G09 readiness where applicable.
**Acceptance criteria:**

- Component readiness verified for WhatsApp → Evolution API → webhook → n8n → AgentFlow Inbox → conversation → lead → qualification → approval → Signal Orchestration → Routing Audit Trail → operator action.
- Uses safe health checks, configuration inspection, and non-client diagnostics.
- Does not execute Phase 11B certification conversation.
- Does not claim full end-to-end lead certification until Phase 11B produces real production evidence.

**Evidence required:**

- `PHASE11A_ACTIVATION_GATE_SCORECARD.md`.

**Rollback requirements:**

- Disable/rollback any config changes that break safety posture.

### G11 — Phase 11B Preparation

**Depends on:** G10.
**Acceptance criteria:**

- Exact controlled test protocol prepared for:
  1. `Hi, I’m interested in the Sea Point apartment.`
  2. `I’m looking to move next month.`
  3. `Can I arrange a viewing?`
- Plan specifies authorized test sender, destination, timing, expected state after each message, threading, qualification, priority, Hot Lead, Viewing Ready, approval, audit evidence, operator action, cleanup/test labeling, failure/rollback.
- Protocol is not executed.

**Evidence required:**

- `PHASE11B_FIRST_INBOUND_TEST_PLAN.md`.

**Rollback requirements:**

- Test-data cleanup procedure only; execution deferred to Phase 11B authorization.

### G12 — Final Phase 11A Certification

**Depends on:** G01-G11 all `PASSED`.
**Acceptance criteria:**

- All reports reconciled with actual production state.
- No secrets or sensitive data included.
- `git diff --check` passes.
- Only relevant changes committed.
- Final plans/evidence/reports committed and pushed.
- Final response includes gate table with status, production evidence, remaining risk, report reference.

**Allowed final outcomes:**

1. `PHASE 11A CERTIFIED — READY FOR PHASE 11B`
2. `PHASE 11A BLOCKED — HUMAN ACTION REQUIRED`
3. `PHASE 11A FAILED — REMEDIATION REQUIRED`

Successful completion language:

`PHASE 11A CERTIFIED — ALL ACCESS AND INFRASTRUCTURE GATES PASSED — READY FOR PHASE 11B FIRST INBOUND CERTIFICATION.`

## 7. Human-Action Checkpoints

| Checkpoint | Gate | Actor | Required action | Confirmation required |
| --- | --- | --- | --- | --- |
| Kopano final password reset | G03 | Kopano | Use production forgot-password flow and set final password privately | `Kopano final reset complete and production login succeeded` |
| Supervised desktop/mobile confirmation if direct auth is unsafe | G05 | Kopano / Founder | Confirm required surfaces on desktop and mobile | Surface checklist outcome only; no credentials |
| WhatsApp QR scan | G07 | Founder / approved device holder | Scan QR for confirmed Libertalia instance | Confirm QR scanned; Nova verifies connected state |
| Email forwarding setup if external mailbox access required | G09 | Founder / Kopano / mailbox admin | Configure approved forwarding source/destination | Confirm forwarding configured; Nova validates readiness |
| Phase 11B execution authorization | After G12 | Founder | Authorize first inbound certification test | Explicit Phase 11B approval |

## 8. Current Decisions

- GitHub/repo docs are the authoritative long-term record for Phase 11A.
- Previous temporary validation is evidence only; it is not Phase 11A completion.
- Kopano's final password must be owned by Kopano through recovery email.
- No autonomous outbound activation in Phase 11A.
- P0/P1 fixes are authorized only when narrowly required to complete Phase 11A.

## 9. Current Risks and Blockers

| Risk / blocker | Severity | Current state | Mitigation |
| --- | --- | --- | --- |
| Kopano final reset not yet confirmed | High | G03 not passed | Provide precise founder/Kopano checkpoint after G01-G02 verification |
| WhatsApp QR pairing requires human scan | High | G07 cannot pass without founder/device action | Verify instance first, then issue exact scan instruction |
| Email forwarding may require mailbox admin access | Medium | G09 pending discovery | Document exact setup step and track checkpoint |
| Prior untracked operational reports exist in local repo | Low/Medium | Must avoid unrelated commits | Commit only Phase 11A durable artifacts unless separately approved |
| Secrets in operational tooling | High | Must avoid echo/report inclusion | Redact all tokens, QR contents, API keys, reset links |

## 10. Required Report Locations

All reports live under:

`Operations/First_Client_Production_Readiness/Phase_11A_Access_Infrastructure_Certification/`

Required files:

- `PHASE11A_MASTER_EXECUTION_PLAN.md`
- `PHASE11A_STATE_LEDGER.md`
- `PHASE11A_PRODUCTION_DOMAIN_AUTH_CERTIFICATION.md`
- `PHASE11A_KOPANO_ACCESS_RECOVERY_REPORT.md`
- `PHASE11A_PERMISSION_MATRIX.md`
- `PHASE11A_EVOLUTION_N8N_CERTIFICATION.md`
- `PHASE11A_WHATSAPP_PAIRING_REPORT.md`
- `PHASE11A_EMAIL_READINESS_REPORT.md`
- `PHASE11A_ACTIVATION_GATE_SCORECARD.md`
- `PHASE11B_FIRST_INBOUND_TEST_PLAN.md`

## 11. Completion Definition

Phase 11A is complete only when:

- G01-G12 are all `PASSED` in `PHASE11A_STATE_LEDGER.md`.
- Every required report exists and is reconciled.
- Human checkpoints have been resolved and recorded without secrets.
- Final GitHub commit and branch are reported.
- The final response uses one allowed final outcome.

## 12. Phase 11B Handoff Requirements

Before Phase 11B begins:

- Phase 11A final certification is complete.
- `PHASE11B_FIRST_INBOUND_TEST_PLAN.md` is committed.
- Founder explicitly authorizes execution.
- Authorized sender/destination/timing are confirmed.
- No Phase 11B test messages have been sent during Phase 11A.
