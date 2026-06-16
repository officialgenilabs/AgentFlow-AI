# Phase 5 — Implementation Sequence

No implementation has been performed. This is the recommended future sequence.

## Phase 5.1 — Safe Copy and Terminology Patch

Risk: **Safe**

Files:

- `src/components/layout/shell.tsx`
- `src/app/login/page.tsx`
- `src/app/demo/page.tsx`
- `src/app/demo/inbox/page.tsx`
- `src/app/demo/governance/page.tsx`
- `src/app/demo/leads/page.tsx`
- `src/app/demo/tasks/page.tsx`

Tasks:

1. Update navigation labels.
2. Update shell footer/header environment labels.
3. Replace production login `Staging Environment` wording.
4. Replace simulator-heavy demo landing copy with demo-safe preview language.
5. Update demo page headings to final terminology.

Gate:

- `npm run lint` if available.
- `npm run build` if available.
- Manual route check: `/login`, `/demo`, `/demo/dashboard`, `/demo/inbox`, `/demo/governance`.

## Phase 5.2 — Logo Treatment Unification

Risk: **Safe → Medium**

Files:

- `src/components/brand/logo.tsx`
- `public/logo.svg`
- `src/lib/demo/data.ts`
- `src/features/branding/branding-form.tsx`

Tasks:

1. Declare `LogoMark` canonical.
2. Normalize `/logo.svg` from canonical geometry.
3. Prefer `LogoMark` fallback in demo by setting demo logo behavior intentionally.
4. Change branding preview image fit from `object-cover` to `object-contain` if approved.
5. Standardize logo wrapper dimensions.

Gate:

- Compare login logo, sidebar logo, mobile header logo, demo landing logo, branding preview.
- Confirm favicon unchanged.

## Phase 5.3 — Demo Dashboard Visual Modules

Risk: **Medium**

Files:

- `src/app/demo/dashboard/page.tsx`
- `src/lib/demo/data.ts`
- optional `src/components/dashboard/signal-orchestration-flow.tsx`
- optional `src/components/dashboard/pending-approvals-summary.tsx`
- optional `src/components/dashboard/routing-audit-trail.tsx`

Tasks:

1. Add Signal Orchestration flow.
2. Add Pending Approvals Queue summary.
3. Add Live Routing Audit Trail summary.
4. Reorder dashboard hierarchy:
   - KPI cards
   - Signal Orchestration
   - Pending Approvals / Audit Trail
   - Recent Leads / Pipeline Stages
5. Keep all demo data clearly demo-safe.

Gate:

- `/demo/dashboard` desktop/mobile visual QA.
- No imports from server-only production data helpers into client-only components unless supported.

## Phase 5.4 — Shared Component Hardening

Risk: **Medium**

Files:

- `src/components/ui/badge.tsx`
- `src/components/ui/status-indicator.tsx`
- `src/components/ui/metric-card.tsx`
- `src/components/ui/evidence.tsx`
- `src/app/globals.css`

Tasks:

1. Add only the variants/tokens actually required by the dashboard modules.
2. Do not restyle all existing surfaces globally.
3. Keep color semantics consistent:
   - mint = safe/active/verified
   - purple = intelligence/context/compliance
   - amber = hold/review
   - red = blocked/error

Gate:

- Check all pages using changed UI primitives.

## Phase 5.5 — Tenant Dashboard Data-Bound Upgrade

Risk: **High**

Files:

- `src/app/app/[orgSlug]/dashboard/page.tsx`
- optional `src/lib/data/dashboard.ts`
- `src/lib/data/approvals.ts`
- `src/lib/data/inbox.ts`

Tasks:

1. Add real data helpers for signal summary.
2. Add safe empty states.
3. Bind pending approvals to real approval/draft state.
4. Bind audit trail to real events/logs only.
5. Keep all queries scoped to `tenant.organization.id`.

Gate:

- Tenant isolation proof.
- Libertalia tenant smoke check.
- Non-admin profile cannot see other org data.
- No fake live metrics.

## Phase 5.6 — Final Client Readiness QA

Risk: **Verification only**

Checks:

1. `https://app.genilabs.co.za/login`
2. `/demo`
3. `/demo/dashboard`
4. Libertalia tenant dashboard after login.
5. Mobile shell/nav.
6. Logo consistency.
7. Property24 route remains protected.
8. Outbound remains governed/frozen unless separately certified.

## Recommended Approval Gate

Approve only Phase 5.1–5.3 first.

Defer Phase 5.5 High-risk tenant data binding until the safe visual polish has been reviewed.
