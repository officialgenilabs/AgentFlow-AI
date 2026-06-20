# Phase 11A — Tenant Branding Readiness Report

**Timestamp:** 2026-06-20 UTC
**Scope:** Libertalia tenant branding and white-label readiness.
**Result:** **SUPPORTED TODAY WITH LIMITED WHITE-LABEL DEPTH**

## 1. Executive Finding

Libertalia Properties can be branded separately from Gen I Labs today at the tenant data layer. The app loads organization-specific name and branding colors/logo through the tenant context.

The current branding system is functional for logo/colors/name, but not a full white-label copy/domain system. Some product copy and sidebar/footer labels still refer to AgentFlow AI / Gen I Labs.

## 2. Live Libertalia Branding State

Live evidence shows:

- Organization slug: `libertalia-properties`
- Organization name: `Libertalia Properties`
- Status: `active`
- Branding row exists.
- Logo URL: not configured.
- Primary color: configured.
- Secondary color: configured.
- Accent color: configured.
- Theme mode: `light`.

No logo file or client-specific brand mark is currently proven configured.

## 3. Source Evidence

| Source | Finding |
|---|---|
| `organization_branding` table | Keyed by `organization_id`; stores `logo_url`, primary/secondary/accent colors, theme mode. |
| `resolveTenantBySlug(...)` | Resolves organization by slug and loads branding for tenant context. |
| `AppShell` | Uses tenant organization name and CSS brand variables from branding. |
| `BrandingPage` / `BrandingForm` | Provides tenant brand mark upload and color controls. |
| `updateBranding(...)` | Requires platform admin or tenant `owner/admin`; writes branding and audit log. |

## 4. Functional Status

| Requirement | Status | Note |
|---|---:|---|
| Tenant-specific organization name | Supported | Header displays `organization.name`. |
| Tenant-specific slug/context | Supported | Routes use `/app/[orgSlug]/...`. |
| Tenant-specific logo | Supported, not configured | Upload writes to `tenant-assets`; live Libertalia row has no logo URL. |
| Tenant-specific colors | Supported | App shell exposes brand CSS variables. |
| Tenant-specific dashboard context | Supported | Data loaders resolve tenant by slug and filter by organization. |
| Tenant-specific communication channels | Supported structurally | Channels are organization-owned; no Libertalia channel exists yet. |
| Tenant-specific copy | Partial | Product shell still includes AgentFlow AI / Gen I Labs language. |
| Tenant custom domain | Not in Phase 11A scope | Current production domain is `https://app.genilabs.co.za`. |

## 5. Onboarding Configuration Needed

Before founder/client-facing rollout:

1. Upload Libertalia logo/brand mark in Brand System.
2. Confirm approved brand colors.
3. Decide whether product shell copy should remain AgentFlow AI or use client white-label copy.
4. Ensure Kopano or a designated Libertalia principal has `owner` or `admin` if they should manage branding.
5. Keep Kopano's current role unchanged until G03/G04 are certified unless founder explicitly approves a role change.

## 6. Risk Notes

- Brand System writes are protected by role checks; Kopano currently appears as `member`, so he should not be able to modify branding unless promoted to owner/admin after permission review.
- Tenant branding is separate from Gen I Labs data, but the UI is not fully white-labeled.
- Branding readiness does not certify Evolution/WhatsApp readiness.

## 7. Recommendation

Branding can proceed as a controlled configuration task after founder confirms assets/colors and an authorized admin performs the change.

Do not use branding readiness as justification to create/pair a Libertalia Evolution instance; channel ownership remains unresolved.
