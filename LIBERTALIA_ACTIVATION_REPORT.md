# Libertalia Properties Activation Report

**Activation requested:** 2026-06-13 11:00 UTC
**Tenant activation executed:** 2026-06-13 11:03 UTC
**Kopano login activation executed:** 2026-06-15 15:16 UTC
**Client / agency:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Login email:** `kopano@libertaliaproperties.co.za`
**Phone:** 063 499 3639
**Normalized phone:** +27634993639
**Architecture mode:** Existing AgentFlow Supabase Auth + `organization_members` implementation only

## Activation status

**Status:** Activated for controlled pilot login.

Libertalia Properties exists as an active AgentFlow tenant and Kopano Nkotsi now has a verified Supabase Auth email/password login linked to the Libertalia organization.

The activation remains narrow: no custom auth system, no public self-signup, no phone-only login, no canonical schema rewrite, and no additional roles.

## Tenant / organization

| Field | Value |
| --- | --- |
| Tenant name | Libertalia Properties |
| Tenant slug | `libertalia-properties` |
| Tenant id | `2110c1e8-933e-46c4-8aaf-17ed03a12ae1` |
| Organization id | `2110c1e8-933e-46c4-8aaf-17ed03a12ae1` |
| Status | `active` |
| Plan | `starter` |
| Industry | `real_estate` |
| Branding row | created |
| Default pipeline stages | created / verified: 6 stages |

Note: AgentFlow currently stores tenants as rows in `public.organizations`; the tenant id and organization id are the same UUID.

## User

| Field | Value |
| --- | --- |
| Full name | Kopano Nkotsi |
| Login email | `kopano@libertaliaproperties.co.za` |
| Phone | 063 499 3639 |
| Normalized phone | +27634993639 |
| Supabase Auth user id | `196bd175-95ef-42f6-ad4a-ea49a86209a4` |
| Profile id | `196bd175-95ef-42f6-ad4a-ea49a86209a4` |
| Email confirmed | Yes |
| Platform admin | No |
| Verified login | Yes — Supabase Auth issued a session during activation verification |

## Role assignment

| Field | Value |
| --- | --- |
| Organization | Libertalia Properties |
| Organization id | `2110c1e8-933e-46c4-8aaf-17ed03a12ae1` |
| Membership id | `0dd28468-adb7-444e-abb4-9d58f945285a` |
| Role | `member` |
| Membership status | `active` |

No additional roles were created. `member` is the lowest current tenant role available in the canonical schema.

## Login URL

Current public login URL returning HTTP 200:

```text
https://agentflow-ai-eta.vercel.app/login
```

Direct tenant route after successful login:

```text
https://agentflow-ai-eta.vercel.app/app/libertalia-properties/dashboard
```

If a newer protected Vercel preview is used instead, Kopano must be granted Vercel preview access or the deployment must be promoted/aliased before client onboarding. The public smoke URL above remains the currently reachable client-facing login URL for this activation record.

## First-login procedure

1. Open:

```text
https://agentflow-ai-eta.vercel.app/login
```

2. Enter:
   - Email: `kopano@libertaliaproperties.co.za`
   - Password: the temporary password supplied to Kaylyn out-of-band / secure handoff.
3. Submit the login form.
4. AgentFlow redirects to `/select-organization`.
5. Because Kopano has one active membership, AgentFlow should route to:

```text
/app/libertalia-properties/dashboard
```

6. If organization selection appears, choose **Libertalia Properties**.
7. Confirm Kopano can open:
   - `/app/libertalia-properties/dashboard`
   - `/app/libertalia-properties/leads`
   - `/app/libertalia-properties/tasks`
   - `/app/libertalia-properties/inbox`
   - `/app/libertalia-properties/approvals`

## Password change / rotation procedure

Current app reality:

- Password login exists.
- Public signup does not exist.
- In-app password setup/change/reset screen does not exist yet.

Therefore the safe current password-rotation process is operator-assisted:

1. Kopano chooses a unique password and sends it to Kaylyn through a secure channel, **or** Kaylyn generates a new strong password for Kopano.
2. Founder/operator opens Supabase Dashboard for the canonical AgentFlow project.
3. Go to **Authentication → Users**.
4. Search `kopano@libertaliaproperties.co.za`.
5. Use the Supabase user admin action to update/reset the password.
6. Kopano logs in again at `https://agentflow-ai-eta.vercel.app/login` using the new password.
7. Once confirmed, discard the temporary password.

Do not build or invent a custom password flow for this activation. A self-service password-change screen should be added as a future product feature.

## Completion verification performed

- Confirmed `libertalia-properties` organization exists and is active.
- Confirmed `organization_branding` row exists with safe placeholder colors.
- Confirmed default pipeline stages are present: 6.
- Created Supabase Auth user for `kopano@libertaliaproperties.co.za`.
- Verified profile row exists with `full_name = 'Kopano Nkotsi'` and `is_platform_admin = false`.
- Added active Libertalia organization membership with role `member`.
- Verified Supabase Auth login succeeds and issues a session.
- Stored temporary login details outside git at `/home/genilabs/.openclaw/credentials/libertalia-kopano-login.env`.

## Pending next activation work

These are separate go-live items and were not changed during login activation:

1. Property24 profile URL and current lead destination email.
2. Property24 email parser/bridge to signed `/api/ingress/property24` JSON.
3. Dedicated or certified Evolution WhatsApp instance.
4. Inbound WhatsApp smoke test.
5. Outbound smoke test before promising live WhatsApp sending.
6. Optional pilot-specific stage/view tuning for `Lead Received → Qualification → Viewing Requested → Viewing Booked`.

## Architecture compliance

- No canonical architecture changes made.
- No code changes made.
- No additional roles created.
- No custom auth system created.
- Existing Supabase Auth + `organization_members` model preserved.
- No password or secret committed to repo or Vault.
