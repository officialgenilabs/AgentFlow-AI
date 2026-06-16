# AgentFlow Phase 5 — Visual Migration Packet

Mode: Planning only.  
Mutation status: **No code changes, commits, pushes, branches, deployments, runtime changes, migrations, env changes, credential changes, DNS changes, n8n/Evolution/Supabase/Vercel changes performed.**

## Objective

Move the safest visual/branding/UX improvements from the staging deployment into the current production codebase while preserving production operational readiness.

Production reference:

- `https://app.genilabs.co.za`
- production runtime commit: `994f469cc0f2338dfcee3ce56896ff7fb45a4500`
- current local release branch contains report commits after that, but source application code remains the production release baseline.

Staging reference:

- `https://agentflow-ai-staging-e06fhzjzk-officialgenilabs-projects.vercel.app`
- staging commit: `5a654d9c64489676c45aaaa6bbbb86e6b9ffc56b`

## Risk Categories

- **Safe** — copy/style only; no runtime behavior or data-source change.
- **Medium** — component creation/modification; still UI-only, but requires build/test review.
- **High** — requires real production data binding or live-data semantics; must not ship with fake tenant data.

## Non-Negotiable Guardrails

Do not change or regress:

- `src/app/api/ingress/property24/route.ts`
- `src/lib/evolution.ts`
- `src/features/approvals/actions.ts`
- `src/lib/data/approvals.ts`
- Supabase client/server binding behavior
- production environment variables
- production Vercel domain/deployment settings
- n8n/Evolution/Property24 runtime configuration

Do not merge staging wholesale. Staging is visually useful but operationally behind production.

---

# File-Level Migration Instructions

## 1. Navigation + Shell

### File: `src/components/layout/shell.tsx`

Risk: **Safe** for label copy; **Medium** if restructuring grouped nav.

#### Current navigation labels

- `/dashboard` — `Operations Cockpit`
- `/inbox` — `Governed Inbound Queue`
- `/approvals` — `Governed Approvals`
- `/leads` — `Context Memory Ledger`
- `/routing` — `Synthetic Routing Flow`
- `/calendar` — `Viewing Calendar`
- `/tasks` — `Operator Follow-ups`
- `/governance` — `Outbound Governance`
- `/branding` — `Branding Parameters`
- `/positioning` — `Wedge Positioning`
- `/vision` — `Vision Roadmap`

#### Required final navigation labels

- `/dashboard` — keep `Operations Cockpit`
- `/inbox` — change to `Governed Queue`
- `/approvals` — change to `Approvals`
- `/leads` — change to `Sovereign Pipeline`
- `/routing` — change to `Routing Flow`
- `/calendar` — keep `Viewing Calendar`
- `/tasks` — change to `Operator Tasks`
- `/governance` — change to `Compliance Settings`
- `/branding` — change to `Brand System`
- `/positioning` — change to `Positioning`
- `/vision` — change to `Roadmap`

#### Shell footer copy changes

Current demo footer:

- Label: `Simulation Active`
- Body: `Interactive guided demonstration. All database operations are synthetic.`

Final demo footer:

- Label: `Demo-Safe Preview`
- Body: `Interactive guided preview. Outbound actions are disabled and all demo data is isolated.`

Current production/footer body:

- `Human-supervised AI routing active. Outbound governance layer engaged.`

Final production/footer body:

- `Human-supervised operational intelligence active. Outbound remains governed by approval controls.`

#### Header environment copy changes

Current:

- Demo eyebrow: `Simulation Layer`
- Demo heading: `Sandton Operations Sandbox`
- Status label: `SIMULATOR`

Final:

- Demo eyebrow: `Demo-Safe Layer`
- Demo heading: `Protected Demo Workspace`
- Status label: `DEMO-SAFE`

Production status remains:

- `LIVE RUNTIME`

#### Mobile layout impact

Same `BrandMark`, nav array, and status labels drive mobile. Validate mobile drawer after label shortening.

---

## 2. Logo System

### File: `src/components/brand/logo.tsx`

Risk: **Medium** if component API changes; **Safe** if no geometry change.

Instructions:

1. Keep `LogoMark` as canonical source of truth.
2. Keep current geometry unless Kaylyn explicitly approves a new logo shape.
3. Add comments or internal convention that `/public/logo.svg` must be generated from this component geometry.
4. Do not alter color gradient unless part of a deliberate brand refresh.
5. Optional future component addition: `LogoFrame` wrapper for consistent size/crop/glow across shell/demo/branding preview.

### File: `public/logo.svg`

Risk: **Safe** if normalized only; **Medium** if visual geometry changes.

Instructions:

1. Normalize line endings/formatting to match canonical SVG output.
2. Ensure same geometry as `LogoMark`.
3. Keep transparent background.
4. Do not add shadow/glow directly to static asset; keep glow in wrapper/component.
5. Use this only where an actual image URL is required.

### File: `src/app/favicon.ico`

Risk: **Safe** if no change.

Instructions:

- Do not change in Phase 5 migration unless canonical logo geometry changes.
- Current favicon matches staging and production and is not a migration blocker.

### File: `src/lib/demo/data.ts`

Risk: **Safe** for demo-only branding constant; **Medium** if changing object shape.

Current:

- `demoBranding.logo_url = "/logo.svg"`

Recommended:

- Option A: set `logo_url` to `null` so demo shell uses canonical `LogoMark` fallback.
- Option B: keep `/logo.svg`, but only after static asset is verified to render identically to `LogoMark` within the same bounding box.

Preferred Phase 5 implementation: **Option A** for visual consistency.

### File: `src/features/branding/branding-form.tsx`

Risk: **Medium**

Instructions:

1. Standardize logo preview box to match `BrandMark` shell dimensions.
2. Ensure uploaded logos use `object-contain`, not `object-cover`, to avoid cropping.
3. Keep upload behavior unchanged.
4. Update preview microcopy from `Tenant Logo Mark` to `Tenant Brand Mark`.

---

## 3. Login + Public Entry Surfaces

### File: `src/app/login/page.tsx`

Risk: **Safe**

Instructions:

1. Keep layout and `LogoMark` usage.
2. Change footer text from `Gen I Labs © 2026 // Staging Environment` to `Gen I Labs © 2026 // Secure Client Workspace`.
3. Keep headline `Operational Calm Under Pressure.`
4. Keep security gateway card.
5. Do not add demo/staging language on production login.

### File: `src/app/layout.tsx`

Risk: **Safe**

Instructions:

1. Keep title: `AgentFlow AI | Operational Intelligence`.
2. Keep description unless a separate marketing copy pass is approved.
3. No favicon change unless logo geometry changes.

### File: `src/app/demo/page.tsx`

Risk: **Safe**

Instructions:

Replace demo landing language:

- `Guided Operational Simulator` → `Demo-Safe Operational Preview`
- `Governed Sandbox Simulator` → `Governed Demo Workspace`
- `Initialize Governed Simulation` → `Enter Demo-Safe Workspace`
- `Staging v1.0.4` → `Demo Preview v1.1`
- `Zero-Dependency Mode` → `No Production Writes`

Keep:

- `Complete Context Ledger Access`
- `Zero Mutation Integrity`
- South African real-estate wedge framing

---

## 4. Demo Dashboard Visual Migration

### File: `src/app/demo/dashboard/page.tsx`

Risk: **Medium**

Instructions:

1. Rename first KPI card:
   - `Simulated Leads` → `Staged Leads`
   - description: `Active lead incidents in demo-safe preview`
2. Keep `Portfolio Volume`, `Governed Channels`, and `Operator Tasks`.
3. Replace `Operational Efficiency Row` with a stronger `Signal Orchestration` module or move latency cards below the signal module.
4. Replace centerpiece card title:
   - `Sovereign Command Simulator` → `Signal Orchestration`
5. Replace centerpiece subtitle:
   - current: `Governed lead signal flow, validation status, and compliance parameters.`
   - final: `Conversational routing infrastructure from raw signal capture to governed agent delegation.`
6. Add five flow cards:
   - Capture — `47 Ingested` — `Ingress gateways active`
   - Qualify — `32 Decided` — `Autonomous budget check`
   - Route — `28 Routed` — `Broker node allocation`
   - Govern — `2 Staged` — `Mandatory human override`
   - Schedule — `18 Booked` — `Viewing/tour sync`
7. Add `Pending Approvals Queue` card below or alongside Signal Orchestration.
8. Add `Live Routing Audit Trail` card with demo audit events.
9. Keep existing Recent Traceable Leads and Operational Pipeline Stages, but place them below the new orchestration/approval layer.

### New component candidate: `src/components/dashboard/signal-orchestration-flow.tsx`

Risk: **Medium**

Instructions:

Create only if implementation wants reuse across demo and tenant dashboards.

Props should be display-only:

- `title`
- `description`
- `steps: Array<{ label; value; detail; tone }>`
- `mode: "demo" | "tenant"`

No direct Supabase calls inside component.

### New component candidate: `src/components/dashboard/pending-approvals-summary.tsx`

Risk: **Medium** for demo; **High** for tenant data binding.

Props should be display-only:

- `items: Array<{ leadName; property; status; confidence? }>`
- `emptyState`
- `href`

No direct Supabase calls inside component.

### New component candidate: `src/components/dashboard/routing-audit-trail.tsx`

Risk: **Medium** for demo; **High** for tenant data binding.

Props should be display-only:

- `entries: Array<{ timestamp; event; actor; status }>`
- `title`
- `description`

---

## 5. Demo Support Data

### File: `src/lib/demo/data.ts`

Risk: **Safe** for demo-only constants.

Instructions:

Add or derive demo-only arrays:

1. `demoSignalOrchestrationSteps`
   - Capture / Qualify / Route / Govern / Schedule.
2. `demoPendingApprovalsSummary`
   - Sibusiso Ndlovu — Sandton Penthouse — pending
   - Sarah Jenkins — Clifton Cliffside — hold
   - David Pieterse — Stellenbosch Estate Villa — blocked
3. `demoRoutingAuditEntries`
   - Compliance Hold
   - Security Block
   - Staged Response Verified
   - Channel Verification Active
4. Optionally update `demoMetrics` names/copy only.

Do not change core lead IDs unless downstream demo pages are updated together.

### File: `src/lib/demo/provider.tsx`

Risk: **Safe / No change recommended**

Instructions:

- No Phase 5 change required if new dashboard modules consume constants directly.
- Only modify if implementation chooses to make signal/approval/audit widgets interactive.

---

## 6. Demo Pages Beyond Dashboard

### File: `src/app/demo/approvals/page.tsx`

Risk: **Safe** for copy; **Medium** for layout refactor.

Instructions:

1. Rename page heading/copy to emphasize `Pending Approvals Queue`.
2. Use `Approval Required`, `Hold`, and `Blocked` statuses consistently.
3. Keep all actions demo-safe.
4. Avoid implying live WhatsApp send in demo.

### File: `src/app/demo/governance/page.tsx`

Risk: **Safe** for copy/style; **Medium** for card layout refactor.

Instructions:

1. Rename `Outbound Governance Dashboard` to `Compliance Settings` or `Governance & Compliance`.
2. Keep emergency breaker wording but clearly mark demo behavior.
3. Make audit trail labels match staging tone:
   - Compliance Hold
   - Security Block
   - Channel Verification Active
   - Staged Response Verified
4. Use purple for compliance/context, amber for holds, red for blocked.

### File: `src/app/demo/inbox/page.tsx`

Risk: **Safe**

Instructions:

1. Rename `COMMUNICATION INGRESS` to `GOVERNED QUEUE`.
2. Replace `Live Inbound Queue` with `Governed Inbound Threads`.
3. Keep outbound warning clear: outbound dispatch remains gated through approvals.

### File: `src/app/demo/routing/page.tsx`

Risk: **Medium**

Instructions:

1. Align page language with `Signal Orchestration`.
2. Prefer `Routing Flow` over `Synthetic Routing Flow`.
3. Reuse `signal-orchestration-flow` if created.
4. Keep this page as the detailed version of dashboard orchestration.

### File: `src/app/demo/leads/page.tsx`

Risk: **Safe**

Instructions:

1. Rename heading/context from `Context Memory Ledger` to `Sovereign Pipeline` where appropriate.
2. Keep lead list behavior unchanged.
3. Preserve source metadata display.

### File: `src/app/demo/tasks/page.tsx`

Risk: **Safe**

Instructions:

1. Rename page/UI copy toward `Operator Tasks`.
2. Keep task data and statuses unchanged.

---

## 7. Tenant / Production Dashboard Migration

### File: `src/app/app/[orgSlug]/dashboard/page.tsx`

Risk: **High** for live metric widgets; **Medium** for UI-only shell/layout.

Instructions:

1. Do not use demo constants in production tenant mode.
2. Add the same visual layout as demo dashboard only after real values are available.
3. Signal Orchestration tenant values must come from real queries or safe empty states:
   - Capture: lead count / recent ingress count.
   - Qualify: qualified or AI-review lead count.
   - Route: assigned lead count or routed events.
   - Govern: pending approval/draft count.
   - Schedule: tasks/viewings/booked tasks count.
4. Pending Approvals Queue must bind to real approval/draft data from production tables/RPCs.
5. Audit Trail must bind to real lead events/audit logs, or show a safe empty state.
6. If data is unavailable, render:
   - `No live signal data yet`
   - `No outbound approvals pending`
   - `No audit events captured yet`

### New/updated data helper candidate: `src/lib/data/dashboard.ts`

Risk: **High**

Instructions:

Create only during implementation if needed.

Recommended exports:

- `getTenantDashboardMetrics(orgId)`
- `getSignalOrchestrationSummary(orgId)`
- `getPendingApprovalSummary(orgId)`
- `getRoutingAuditSummary(orgId)`

Guardrails:

- Must use existing RLS-safe Supabase server client.
- Must scope all queries to `tenant.organization.id`.
- Must not use service role.
- Must not bypass RLS.

### File: `src/lib/data/approvals.ts`

Risk: **High**

Instructions:

- Only extend read helpers if needed for dashboard summary.
- Do not change write/review/send behavior.
- Do not alter governed outbound execution logic.

### File: `src/lib/data/inbox.ts`

Risk: **High**

Instructions:

- Only extend read helpers if needed for conversation/routing summaries.
- Do not alter message ingestion assumptions.
- Do not create outbound behavior.

---

## 8. Tenant Pages Beyond Dashboard

### File: `src/app/app/[orgSlug]/approvals/page.tsx`

Risk: **High**

Instructions:

1. Keep production-backed approval data.
2. Apply staging visual polish only to card layout/status language.
3. Do not replace with demo approval objects.
4. Keep outbound freeze/governance behavior untouched.

### File: `src/app/app/[orgSlug]/governance/page.tsx`

Risk: **Medium** for copy/style; **High** if live policy data is added.

Instructions:

1. Rename visible concept to `Compliance Settings` or `Governance & Compliance`.
2. Add visual hierarchy matching staging.
3. Do not expose fake compliance checks as live state.

### File: `src/app/app/[orgSlug]/routing/page.tsx`

Risk: **High**

Instructions:

1. Use `Routing Flow` terminology.
2. Connect to real events only if available.
3. Otherwise show safe empty state.

### File: `src/app/app/[orgSlug]/inbox/page.tsx`

Risk: **Medium** for copy/style; **High** for new counts/data.

Instructions:

1. Rename concepts toward `Governed Queue`.
2. Keep existing message/thread behavior unchanged.
3. Do not add send capability.

### File: `src/app/app/[orgSlug]/leads/page.tsx`

Risk: **Safe** for copy; **High** for new metrics.

Instructions:

1. Use `Sovereign Pipeline` language where it describes the lead/pipeline surface.
2. Preserve existing CRM list/create/detail behavior.

### File: `src/app/app/[orgSlug]/tasks/page.tsx`

Risk: **Safe** for copy; **High** for new scheduling/live task aggregation.

Instructions:

1. Use `Operator Tasks` language.
2. Preserve existing task view behavior.

---

## 9. Design System / Style Files

### File: `src/app/globals.css`

Risk: **Safe**

Instructions:

Add or document semantic tokens if implementation wants cleaner maintenance:

- `--accent-safe: #00E599`
- `--accent-safe-hover: #00CC88`
- `--accent-intelligence: #6C63FF`
- `--accent-intelligence-soft: #A29EFF`
- `--accent-warning: amber-500 equivalent`
- `--accent-blocked: red-500 equivalent`

No visual reset or global layout change in Phase 5 implementation.

### File: `src/components/ui/badge.tsx`

Risk: **Medium**

Instructions:

Existing variants include:

- `neutral`
- `active`
- `warning`
- `error`
- `mint`
- `orchestration`

Optional additions:

- `hold` — amber review state.
- `blocked` — red compliance stop.
- `context` — purple memory/context state.

Only add if new dashboard modules need clearer semantic labels.

### File: `src/components/ui/status-indicator.tsx`

Risk: **Medium**

Instructions:

Existing statuses are sufficient:

- `active`
- `warning`
- `error`
- `offline`
- `governance`

No required change. Optional: add `demo` status only if badge/status semantics become clearer.

### File: `src/components/ui/metric-card.tsx`

Risk: **Medium**

Instructions:

No required change. Optional: add tone prop for dashboard modules:

- `tone="safe" | "intelligence" | "warning" | "blocked"`

Do not modify unless repeated styling in dashboard cards becomes messy.

### File: `src/components/ui/evidence.tsx`

Risk: **Medium**

Instructions:

Can be reused for audit trail/ledger surfaces. Only modify if dashboard audit trail needs a compact variant.

---

# Dashboard Modules To Migrate

## Module 1 — Signal Orchestration

Risk:

- Demo: **Medium**
- Tenant: **High**

Target files:

- `src/app/demo/dashboard/page.tsx`
- optional new `src/components/dashboard/signal-orchestration-flow.tsx`
- later `src/app/app/[orgSlug]/dashboard/page.tsx`
- later `src/lib/data/dashboard.ts`

## Module 2 — Pending Approvals Queue

Risk:

- Demo: **Medium**
- Tenant: **High**

Target files:

- `src/app/demo/dashboard/page.tsx`
- optional new `src/components/dashboard/pending-approvals-summary.tsx`
- later `src/app/app/[orgSlug]/dashboard/page.tsx`
- later `src/lib/data/approvals.ts`

## Module 3 — Live Routing Audit Trail

Risk:

- Demo: **Medium**
- Tenant: **High**

Target files:

- `src/app/demo/dashboard/page.tsx`
- `src/app/demo/routing/page.tsx`
- optional new `src/components/dashboard/routing-audit-trail.tsx`
- later `src/app/app/[orgSlug]/routing/page.tsx`
- later `src/lib/data/inbox.ts` or `src/lib/data/dashboard.ts`

## Module 4 — Logo Treatment Unification

Risk:

- Static/visual: **Safe**
- Component wrapper: **Medium**

Target files:

- `src/components/brand/logo.tsx`
- `public/logo.svg`
- `src/lib/demo/data.ts`
- `src/features/branding/branding-form.tsx`

## Module 5 — Navigation Terminology Pass

Risk: **Safe**

Target file:

- `src/components/layout/shell.tsx`

---

# Final Recommendation

Implement in this order:

1. Safe copy/navigation pass.
2. Logo treatment unification.
3. Demo dashboard visual modules.
4. Demo page copy polish.
5. Shared component extraction if needed.
6. Tenant dashboard real-data binding only after UI is stable.

Do not implement High-risk data-bound tenant modules in the same patch as Safe visual polish unless explicitly approved.
