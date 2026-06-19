# Phase 11A — Production, Domain, and Auth Certification

**Created:** 2026-06-19 UTC  
**Scope:** G01 Production Baseline and G02 Domain/DNS/SSL/Auth Callback Certification  
**Current status:** G01 `PASSED`; G02 `IN PROGRESS`

## Evidence Files

- `evidence/g01_git_baseline.txt`
- `evidence/g01_vercel_project_summary.json`
- `evidence/g01_runtime_governance_checks.txt`

## G01 — Production Baseline Certification

### Status

`PASSED` — production baseline is certified with documented non-blocking deployment-governance risk.

### Verified Facts

| Item | Observed production state | Result |
| --- | --- | --- |
| Repository | Git remote resolves to `git@github.com:officialgenilabs/agentflow-ai.git`; GitHub reports repository moved to `officialgenilabs/AgentFlow-AI` but push succeeds | PASS |
| Local/release branch | `release/agentflow-v2-production` | PASS |
| Current GitHub release head | `c137baaeb3cecebd007c3926e973754b1eadc38d` | PASS |
| Current production deployment | Vercel deployment `dpl_FHBucmcPXHwnuXzW5SBuQFDusq65` / `agentflow-q97jmw05t-officialgenilabs-projects.vercel.app` | PASS |
| Production source commit | `761656328cce9e7e4a39d66108777d78b8ee5853` (`Add Phase 11A production auth recovery flow`) | PASS |
| Production source ref | `release/agentflow-v2-production` | PASS |
| Canonical production alias | `https://app.genilabs.co.za` assigned to the current Vercel production target | PASS |
| Phase 10B deployed lineage | Historical Phase 10B commit `847f2b2` is an ancestor of the current production source commit | PASS |
| Rollback reference | `50cdaf4` exists as a valid commit and appears in recent production deployment history | PASS |
| Branch head vs production app drift | Current branch head is ahead of production source commit only by `.vercelignore` plus Phase 11A documentation/evidence files; no app source files differ | PASS |
| Working tree condition | Untracked historical Operations/client/supabase temp docs exist locally; they are unrelated and not included in Phase 11A commits | PASS WITH NOTE |
| Governance surfaces | Production dashboard/governance/approvals/inbox/routing routes return `200` under authenticated Kopano temporary validation session and render governance/signal evidence | PASS |
| Protected route middleware | Anonymous Libertalia dashboard request redirects to `/login` | PASS |
| Outbound freeze | Source guard requires `OUTBOUND_TRANSPORT_ENABLED === "true"`; production env key exists as sensitive and was not exposed; governance/approvals routes show human-supervised outbound posture; no send action executed | PASS |

### Observed Production Behavior

Authenticated production runtime checks used the previously approved temporary validation session for Kopano. This is accepted for G01 production surface proof only. It is **not** accepted as G03 final Kopano credential certification.

Runtime evidence included:

- `/app/libertalia-properties/dashboard` → `200`; evidence: `Production Signal Orchestration`, `Production Routing Audit Trail`, `Governed Queue`, `Approvals`, `Operations Cockpit`.
- `/app/libertalia-properties/governance` → `200`; evidence: `Outbound Control State`, `Autonomous Outbound Dispatch`, `Governed Queue`, `Approvals`, `Operations Cockpit`.
- `/app/libertalia-properties/approvals` → `200`; evidence: `Governance Safeguard`, `Governed Queue`, `Approvals`, `Operations Cockpit`.
- `/app/libertalia-properties/inbox` → `200`; evidence: `Governed Queue`, `Approvals`, `Operations Cockpit`.
- `/app/libertalia-properties/routing` → `200`; evidence: `Production Signal Orchestration`, `Production Routing Audit Trail`, `Human approval before outbound`, `Governed Queue`, `Approvals`, `Operations Cockpit`.

### Deployment Drift Assessment

Production Vercel metadata reports `gitDirty=1` for the promoted production deployment. This is explained by the CLI production deployment performed before committing `.vercelignore` and Phase 11A evidence documents. Current GitHub head differs from production source commit only by documentation/evidence/deploy-hygiene files; no app source files differ.

This is not app-affecting drift and does not block G01. It remains a deployment-governance note for final reconciliation.

### Non-Blocking Risk

Vercel project metadata reports Git-link `productionBranch=develop`, while the actual current production deployment was promoted by CLI from `release/agentflow-v2-production`. This mismatch is documented as a deployment-governance risk. No automatic configuration change was made because the current production target is correct and changing Vercel production-branch policy is outside the immediate G01 acceptance requirement unless founder approves or it becomes blocking.

### Rollback Reference

Validated rollback references:

- Phase 10B production deployment: `847f2b2` / deployment `agentflow-9n56grtez-officialgenilabs-projects.vercel.app`.
- Phase 10A rollback reference: `50cdaf4` / deployment `agentflow-7z8czzytk-officialgenilabs-projects.vercel.app`.

Rollback was **not** executed.

## G02 — Domain, DNS, SSL and Auth Callback Certification

### Status

`IN PROGRESS` — not yet certified.

### Initial Discovery

Vercel production target aliases currently include:

- `app.genilabs.co.za` — intended canonical client-facing domain.
- `agentflow-ai-eta.vercel.app` — historical Vercel alias, still assigned to production.
- `agentflow-ai-officialgenilabs-projects.vercel.app` — automatic Vercel alias.
- `agentflow-ai-officialgenilabs-officialgenilabs-projects.vercel.app` — automatic Vercel alias.

Project domains currently include:

- `app.genilabs.co.za` — verified.
- `agentflow-ai-eta.vercel.app` — verified historical alias.

A preview deployment also exists for current docs commit `c137baa` under branch alias `agentflow-ai-git-release-agent-3555e4-officialgenilabs-projects.vercel.app`. It is preview/staged, not production.

### G02 Remaining Work

- Verify DNS resolution and SSL certificate chain for all active domains.
- Verify canonical redirect/middleware behavior across canonical and non-canonical domains.
- Verify auth callback behavior.
- Verify password-reset redirect behavior.
- Verify invitation/login/logout redirects.
- Verify Supabase Site URL and allowed redirect URLs through safe configuration inspection or record exact blocker.
- Confirm no auth links resolve to localhost, stale preview deployments, obsolete aliases, wrong tenants, or unauthorized domains.

## Secrets Review

This report contains no passwords, API keys, access tokens, QR contents, webhook secrets, or recovery links.
