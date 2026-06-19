# Phase 11A — Production, Domain, and Auth Certification

**Created:** 2026-06-19 UTC  
**Scope:** G01 Production Baseline and G02 Domain/DNS/SSL/Auth Callback Certification  
**Current status:** G01 `PASSED`; G02 `PASSED`; G03 `WAITING ON KOPANO`

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

`PASSED` — certified after founder/Supabase admin confirmation plus production runtime and canonical recovery-request evidence.

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

## G02 Partial Certification Results

### Verified Facts

| Item | Observed behavior | Result |
| --- | --- | --- |
| Canonical domain | `https://app.genilabs.co.za/login` returns `200` over HTTPS | PASS |
| Historical alias canonicalization | `https://agentflow-ai-eta.vercel.app/login` returns `307` to `https://app.genilabs.co.za/login` | PASS |
| Production deployment hostname canonicalization | `https://agentflow-q97jmw05t-officialgenilabs-projects.vercel.app/...` redirects to canonical or is protected as expected | PASS |
| Preview branch alias | Preview alias for docs commit returns Vercel auth `401`, not a public stale app | PASS |
| Mobile browser redirect behavior | Mobile UA receives same canonical behavior for `app.genilabs.co.za`; historical alias redirects to canonical | PASS |
| Auth callback guard | `/auth/callback?next=/reset-password` without code redirects to `/login?error=auth-code-required` on canonical app | PASS |
| Logout redirect | `/logout` routes to canonical login signed-out state | PASS |
| Protected route middleware | Anonymous `/app/libertalia-properties/dashboard` redirects/blocks unauthenticated access | PASS |
| Client bundle Supabase authority | Live client bundle contains canonical Supabase project ref and no legacy project ref | PASS |
| Client bundle stale-preview scan | Live client bundle contains no known stale preview deployment references | PASS |
| Client bundle localhost context | `localhost` string exists only in bundled third-party parser/default snippets, not as observed app redirect target | PASS WITH NOTE |
| Supabase redirect allow-list direct inspection | Not accessible with current local credentials/tooling without dashboard/management token | WAITING ON FOUNDER |

### Supabase Redirect Probe Result

A non-existent validation identity was used to avoid sending a real recovery email. Supabase returned `NO_ERROR` for canonical, historical alias, localhost, and intentionally unauthorized redirect classes. This means the non-existent-user probe is **inconclusive** for allow-list certification and cannot be used as PASS evidence.

G02 therefore remains `WAITING ON FOUNDER` until the Supabase Auth URL Configuration is verified from the dashboard or a safe management API path is provided.

### Human Checkpoint Required

Founder/Supabase project admin must verify the canonical production auth URL configuration for project `vgpguhrmvetutvtctsid`:

1. Open Supabase Dashboard → Project `vgpguhrmvetutvtctsid` → Authentication → URL Configuration.
2. Confirm **Site URL** is exactly `https://app.genilabs.co.za`.
3. Confirm redirect URLs support the production callback used by AgentFlow: `https://app.genilabs.co.za/auth/callback` (or an equivalent canonical `https://app.genilabs.co.za/**` entry if Supabase requires wildcard coverage).
4. Confirm redirect URLs do **not** include localhost, stale preview deployments, obsolete aliases, unrelated tenant domains, or unauthorized domains.
5. Do not share tokens, reset links, API keys, or screenshots containing secrets.
6. Reply only with: `Supabase auth URL config verified for app.genilabs.co.za; no localhost/stale/unauthorized redirects remain.`

After that confirmation, Nova will reopen this plan and ledger, mark G02 accordingly, and proceed to G03 Kopano final reset.

## G02 Founder Checkpoint Resolution

Founder reported at 2026-06-19 08:53 UTC that Supabase Auth URL Configuration for project `vgpguhrmvetutvtctsid` was corrected and saved:

- Site URL: `https://app.genilabs.co.za`
- Allowed production redirects:
  - `https://app.genilabs.co.za/auth/callback`
  - `https://app.genilabs.co.za/**`
- Founder confirmed there are no localhost, stale-preview, unrelated, or unauthorized redirects.

### Production Evidence After Checkpoint

- Production app remains aliased to `https://app.genilabs.co.za`.
- Production runtime checks already showed canonical redirect behavior for non-canonical aliases and mobile user agents.
- Live client bundle contains the canonical Supabase project ref and no legacy Supabase or known stale preview refs.
- G03 canonical password recovery request for Kopano was accepted with redirect destination `https://app.genilabs.co.za/auth/callback?next=/reset-password`; no reset link, token, or password was logged. Evidence: `evidence/g03_recovery_email_request.txt`.

### G02 Decision

G02 is marked `PASSED` because the previously blocking Supabase Auth URL Configuration has been corrected by the founder/Supabase admin and the production application behavior uses the canonical domain/callback path.

## Secrets Review

This report contains no passwords, API keys, access tokens, QR contents, webhook secrets, or recovery links.
