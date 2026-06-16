# AgentFlow AI — Staging vs Production Visual Migration Report

Date: 2026-06-16
Mode: Read-only comparison; no production/staging changes made.

## Compared Deployments

### Current Production

- URL: `https://app.genilabs.co.za`
- Vercel project: `agentflow-ai`
- Branch: `release/agentflow-v2-production`
- Commit: `994f469cc0f2338dfcee3ce56896ff7fb45a4500`
- Property24 route: present; unsigned POST returns `401 signed_ingress_required`

### Staging Link Provided

- URL: `https://agentflow-ai-staging-e06fhzjzk-officialgenilabs-projects.vercel.app`
- Vercel project: `agentflow-ai-staging`
- Branch: `staging/canonical-frontend-elevation`
- Commit: `5a654d9c64489676c45aaaa6bbbb86e6b9ffc56b`
- Property24 route: not present; `/api/ingress/property24` returns `404`

## Executive Summary

The staging deployment is **not ahead of production operationally**. Production is newer and contains the current backend-critical Phase 10/Property24 work.

However, staging has a more polished **visual / product-language layer** in the public demo surfaces. The strongest safe migration opportunities are:

1. More client-ready shell/navigation wording.
2. Stronger demo-safe/preview safety badges.
3. A better “Signal Orchestration” dashboard section.
4. A useful “Pending Approvals Queue” preview module.
5. A more professional staging/compliance audit-trail narrative.

The inline logo component and favicon are identical across the compared builds, but there are two logo surfaces (`LogoMark` and `/logo.svg`). The perceived logo difference should be treated as a logo-treatment/unification issue, not a backend or deployment issue.

## Logo / Brand Mark Finding — Corrected

There are **two logo delivery surfaces** in the app, which explains why the logos can look different in practice:

1. `src/components/brand/logo.tsx` — the inline React/SVG `LogoMark` used in login, shell, and major app chrome.
2. `public/logo.svg` — a static SVG asset referenced by demo/branding data, including `src/lib/demo/data.ts` via `logo_url: "/logo.svg"`.

### Production

- Inline React `LogoMark`: present.
- Static `/logo.svg`: present.
- Favicon: present.

### Staging

- Inline React `LogoMark`: present.
- Static `/logo.svg`: present.
- Favicon: present.

### Verification

- `src/components/brand/logo.tsx` is identical between production commit `994f469` and staging commit `5a654d9`.
- `src/app/favicon.ico` is identical between production and staging.
- `public/logo.svg` differs at byte/hash level between production and staging, but the source diff observed between the compared commits is formatting/whitespace only.
- The visible difference the user sees is therefore most likely caused by **which logo surface is being rendered** and by wrapper treatment — size, glow, background, spacing, and whether it is the inline `LogoMark` or `/logo.svg`.

### Conclusion

Do **not** assume staging has a wholly different logo system. It has a different rendered logo treatment/context.

Safe migration should focus on:

- Unifying logo usage between inline `LogoMark` and `/logo.svg`.
- Ensuring the same logo surface is used in production shell, demo branding, and tenant branding placeholders.
- Migrating staging’s better shell/badge visual treatment around the logo.
- Keeping the current production backend untouched.

## Visual Features Staging Has Over Production

## 1. Cleaner Sidebar Navigation Language

### Production wording observed

- Governed Inbound Queue
- Context Memory Ledger
- Synthetic Routing Flow
- Operator Follow-ups
- Outbound Governance
- Branding Parameters
- Wedge Positioning
- Vision Roadmap
- Simulation Active
- Simulation Layer
- Sandton Operations Sandbox
- SIMULATOR

### Staging wording observed

- Governed Queue
- Sovereign Pipeline
- Memory Ledger
- Routing Flow
- Operator Tasks
- Compliance Settings
- Tenant Isolation
- Demo-Safe Preview
- Demo-Safe Layer
- Protected Preview Workspace
- STAGING PREVIEW

### Why staging is better visually

Staging reads more like a real product cockpit and less like an internal simulator. It feels cleaner, more executive-facing, and more appropriate for a first client/pilot presentation.

### Safe migration recommendation

**Migrate selectively.**

Recommended production-safe labels:

- Governed Queue
- Sovereign Pipeline
- Memory Ledger
- Routing Flow
- Operator Tasks
- Compliance Settings
- Tenant Isolation

Avoid exposing “STAGING PREVIEW” in production tenant mode. Use environment-aware labels instead:

- Production tenant: `Live Client Workspace`
- Demo mode: `Demo-Safe Preview`
- Internal/staging: `Protected Preview Workspace`

Risk: Low if treated as copy-only and route mappings remain unchanged.

## 2. Demo-Safe / Protected Preview Badges

### Production framing

Production demo says:

- Simulation Active
- Interactive guided demonstration.
- All database operations are synthetic.
- Simulation Layer
- Sandton Operations Sandbox
- SIMULATOR

### Staging framing

Staging says:

- Demo-Safe Preview
- Interactive guided demonstration.
- Outbound actions are disabled in this mode.
- Demo-Safe Layer
- Protected Preview Workspace
- STAGING PREVIEW

### Why staging is better visually

Staging makes the safety model easier to understand. “Outbound actions are disabled” is clearer and more reassuring than broad “synthetic” language.

### Safe migration recommendation

Migrate the **demo safety copy pattern**, but adapt production labels:

- For `/demo`: keep `Demo-Safe Preview`.
- For production tenant workspace: do not show “STAGING”.
- For outbound-frozen state: show `Outbound Frozen` or `Outbound Requires Approval`.

Risk: Low.

## 3. Signal Orchestration Dashboard Section

### Staging section observed

- `SIGNAL ORCHESTRATION`
- `Conversational Routing Infrastructure`
- “Live signal propagation from raw message ingestion to governed agent delegation.”
- Flow cards:
  - Capture — 47 Ingested — Ingress gateways active
  - Qualify — 32 Decided — Autonomous budget check
  - Route — 28 Dispatched — Broker node allocation
  - Govern — 2 Staged — Mandatory human override
  - Schedule — 18 Booked — Instant tour sync

### Production equivalent

Production currently uses a more simulator-oriented section:

- `Sovereign Command Simulator`
- Governed lead signal flow, validation status, and compliance parameters.

### Why staging is better visually

The staging section explains AgentFlow’s value chain in one glance: capture → qualify → route → govern → schedule. This is very strong for client demos and founder-facing product positioning.

### Safe migration recommendation

Migrate this as a visual dashboard module, but wire values to production-safe data sources or clearly mark as demo metrics in `/demo`.

Best target locations:

- `/demo/dashboard` first.
- Later `/app/[orgSlug]/dashboard` only after mapping metrics to real tables.

Risk: Low for demo route; Medium for authenticated tenant route unless backed by real queries.

## 4. Pending Approvals Queue Preview

### Staging section observed

- `Pending Approvals Queue`
- “Staged outbound communications requiring operator sign-off.”
- Example records:
  - Sibusiso Ndlovu — Sandton Penthouse — pending
  - Sarah Jenkins — Clifton Cliffside — hold
  - David Pieterse — Stellenbosch Estate Villa — blocked

### Production state

Production has real governed approvals capability, but its dashboard does not surface this visual preview in the same compact, client-friendly way.

### Why staging is better visually

It makes the human-in-the-loop safety gate visible immediately. That is valuable for Kopano onboarding because it shows that AgentFlow is not recklessly auto-sending messages.

### Safe migration recommendation

Migrate the compact queue visual, but bind it to current production approval/draft data where available.

Safe fallback:

- If no live approvals exist, show an empty-state card: `No outbound approvals pending`.

Risk: Medium if connected to live data; Low if used only in demo mode.

## 5. Live Routing / Compliance Audit Trail Language

### Staging observed

- `Live Routing Audit trail`
- `Realtime ledger of lead signal propagation`
- `Staging Compliance Audit Trail`
- Events framed as compliance/security/operator actions.

### Production observed

Production contains audit/traceability language, but the staging copy feels more cohesive and operational:

- Security Block
- Compliance Hold
- Channel Verification Active
- Staged Response Verified

### Why staging is better visually

It gives the UI a stronger “system of record” feeling and supports the sovereign/compliance positioning.

### Safe migration recommendation

Migrate the copy structure and card layout into demo/audit surfaces. Do not migrate fake timestamps or hardcoded audit records into live tenant views.

Risk: Low for copy/layout; Medium if live data mapping is rushed.

## 6. Stronger Purple Accent Use

### Evidence

Rendered staging pages use more `#A29EFF`, `#6C63FF`, and low-opacity purple panels around preview/compliance concepts.

### Why staging is better visually

Production leans heavily mint/green. Staging adds more purple contrast, which improves hierarchy between:

- safe/pass/governed states = mint
- intelligence/compliance/context states = purple
- warning/hold states = amber/red

### Safe migration recommendation

Adopt the accent convention:

- Mint: success, active, verified, approved
- Purple: intelligence, context, routing, compliance, memory
- Amber: hold/review
- Red: blocked/error

Risk: Low.

## Safe Migration Candidate Matrix

| Candidate | Safe to migrate? | Target | Risk | Notes |
|---|---:|---|---|---|
| Sidebar label cleanup | Yes | `AppShell` | Low | Copy-only if routes unchanged. |
| Demo-Safe / Protected Preview badges | Yes | Demo shell + environment badges | Low | Must be environment-aware. |
| Signal Orchestration section | Yes | `/demo/dashboard` | Low | Use demo data first. |
| Signal Orchestration in tenant dashboard | Later | `/app/[orgSlug]/dashboard` | Medium | Needs real metrics mapping. |
| Pending Approvals Queue card | Yes, carefully | Demo first; tenant later | Medium | Production has real approval backend; must not replace it with mock logic. |
| Compliance audit trail copy/layout | Yes | Demo/audit sections | Low-Medium | Copy/layout safe; live data requires mapping. |
| Purple accent hierarchy | Yes | Global UI conventions/components | Low | Visual-only. |
| Logo treatment unification | Yes | `LogoMark` + `/logo.svg` usage | Low | Inline logo and static logo surfaces should be unified; staging/prod difference is likely treatment/context, not a new core logo. |

## Do NOT Migrate From Staging

These staging elements must not be copied wholesale into production:

1. Anything that removes or reverts `src/app/api/ingress/property24/route.ts`.
2. Anything that removes `src/lib/evolution.ts`.
3. Anything that removes or downgrades governed outbound production actions.
4. Client-only/mock approvals replacing production-backed approval flows.
5. Staging project env assumptions.
6. “STAGING PREVIEW” labels in live production tenant surfaces.

Reason: the staging deployment is visually useful but operationally older. Production has the required backend routes and environment configuration for current launch readiness.

## Recommended Migration Order

### Step 1 — Safe Visual Copy Pass

- Update demo/sidebar labels to the cleaner staging vocabulary.
- Keep production route structure unchanged.
- Keep current logo component unchanged.

### Step 2 — Demo Dashboard Enhancement

- Add the staging-style `Signal Orchestration` module to `/demo/dashboard`.
- Add compact `Pending Approvals Queue` preview to `/demo/dashboard`.
- Mark all values as demo-safe if synthetic.

### Step 3 — Tenant Dashboard Version

- Recreate the same visual sections in `/app/[orgSlug]/dashboard`, but only with real Supabase-backed values.
- If live values are not ready, show safe empty states.

### Step 4 — Visual System Hardening

- Formalize accent-color semantics:
  - Mint = verified / active / safe
  - Purple = intelligence / routing / memory / compliance
  - Amber = hold / review
  - Red = blocked / error

## Final Recommendation

Migrate staging’s **visual language and demo dashboard composition**, not its backend or older workflow state.

The highest-value safe migration package is:

1. Navigation label refinement.
2. Demo-safe preview state badges.
3. Signal Orchestration dashboard module.
4. Compact Pending Approvals Queue preview.
5. Compliance/audit trail copy and purple-accent hierarchy.

This can be done safely as a UI-only pass if production backend files remain untouched and all staging/demo labels are environment-aware.
