# Phase 5 — Risk Classification Matrix

## Safe — Copy / Style Only

| Change | Files | Why Safe | Verification |
|---|---|---|---|
| Rename nav labels | `src/components/layout/shell.tsx` | Copy only; routes unchanged | Visual check desktop/mobile nav |
| Update shell demo footer copy | `src/components/layout/shell.tsx` | Copy only | Demo shell renders `Demo-Safe Preview` |
| Update shell header demo labels | `src/components/layout/shell.tsx` | Copy only | Header shows `Protected Demo Workspace` |
| Login footer environment wording | `src/app/login/page.tsx` | Copy only | Login no longer says staging |
| Demo landing wording | `src/app/demo/page.tsx` | Copy only | Demo page reads preview, not simulator |
| Demo page heading copy polish | demo pages | Copy only | Text checks |
| Static `/logo.svg` formatting normalization | `public/logo.svg` | No geometry change | Hash may change; normalized SVG geometry same |
| Keep favicon unchanged | `src/app/favicon.ico` | No change | Browser tab stable |
| Accent token documentation/addition | `src/app/globals.css` | Style-only token addition | Build + visual check |
| Rename `COMMUNICATION INGRESS` to `GOVERNED QUEUE` | `src/app/demo/inbox/page.tsx` | Copy only | Inbound behavior unchanged |
| Rename demo governance copy to Compliance Settings | `src/app/demo/governance/page.tsx` | Copy only | No behavior change |
| Rename leads surface to Sovereign Pipeline | `src/app/demo/leads/page.tsx`, tenant leads copy | Copy only | Lead routes unchanged |
| Rename tasks copy to Operator Tasks | `src/app/demo/tasks/page.tsx`, tenant tasks copy | Copy only | Task routes unchanged |

## Medium — Component Modification / New UI Modules

| Change | Files | Why Medium | Verification |
|---|---|---|---|
| Add `SignalOrchestrationFlow` component | `src/components/dashboard/signal-orchestration-flow.tsx` | New display component | Build, responsive visual check |
| Add `PendingApprovalsSummary` component | `src/components/dashboard/pending-approvals-summary.tsx` | New display component | Empty/data state visual check |
| Add `RoutingAuditTrail` component | `src/components/dashboard/routing-audit-trail.tsx` | New display component | Table/card overflow check |
| Refactor demo dashboard layout | `src/app/demo/dashboard/page.tsx` | Page composition changes | Demo dashboard visual QA |
| Add demo constants | `src/lib/demo/data.ts` | Demo data shape additions | Typecheck |
| Standardize logo wrapper | `src/components/brand/logo.tsx` or new wrapper | Component surface change | Compare login/sidebar/mobile/demo |
| Update branding form image fit | `src/features/branding/branding-form.tsx` | Component layout change | Upload preview visual QA |
| Add badge variants | `src/components/ui/badge.tsx` | Shared UI primitive change | Search affected badge usages |
| Add metric card tone prop | `src/components/ui/metric-card.tsx` | Shared UI primitive change | Existing cards must not regress |
| Compact evidence/audit variant | `src/components/ui/evidence.tsx` | Shared UI primitive change | Existing evidence cards must not regress |

## High — Production Data Binding Required

| Change | Files | Why High | Verification |
|---|---|---|---|
| Tenant Signal Orchestration real metrics | `src/app/app/[orgSlug]/dashboard/page.tsx`, `src/lib/data/dashboard.ts` | Requires RLS-safe production queries | Tenant isolation + empty state tests |
| Tenant Pending Approvals summary | `src/app/app/[orgSlug]/dashboard/page.tsx`, `src/lib/data/approvals.ts` | Must bind to real approval/draft data | No fake approvals in tenant mode |
| Tenant Routing Audit Trail | `src/app/app/[orgSlug]/dashboard/page.tsx`, `src/app/app/[orgSlug]/routing/page.tsx`, `src/lib/data/dashboard.ts` | Requires real lead events/audit data | Org-scoped events only |
| Governance live compliance status | `src/app/app/[orgSlug]/governance/page.tsx` | Must not fake compliance checks | Safe empty state if unavailable |
| Inbox active conversation counts | `src/app/app/[orgSlug]/inbox/page.tsx`, `src/lib/data/inbox.ts` | Live conversation data | RLS/tenant scope check |
| Schedule/booked viewing metrics | `src/app/app/[orgSlug]/dashboard/page.tsx`, task data helpers | Requires real task/scheduling semantics | No fake booking numbers |
| Production pipeline value refinements | `src/app/app/[orgSlug]/dashboard/page.tsx` | Real estimated value aggregation | Org-scoped aggregate only |

## Hard Exclusions

Do not touch in Phase 5 visual migration unless separately approved:

- `src/app/api/ingress/property24/route.ts`
- `src/lib/evolution.ts`
- write paths in `src/features/approvals/actions.ts`
- Supabase migrations
- Vercel configuration
- env files
- n8n workflows
- Evolution webhook config
- DNS
