# Libertalia Properties Activation Report

**Activation requested:** 2026-06-13 11:00 UTC
**Activation executed:** 2026-06-13 11:03 UTC
**Client / agency:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Phone:** 063 499 3639
**Normalized phone:** +27634993639
**Architecture mode:** Existing AgentFlow Supabase Auth + `organization_members` implementation only

## Activation status

**Status:** Partially activated — tenant created; user creation is blocked until Kopano's login email is supplied.

The current AgentFlow login implementation is email/password based. No phone-login or public self-signup flow exists in the canonical app. Creating a real client login therefore requires a real login email for Kopano.

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
| Phone | 063 499 3639 |
| Normalized phone | +27634993639 |
| Supabase Auth user id | **Pending — login email required** |
| Profile id | **Pending — login email required** |
| Platform admin | No |

### User creation blocker

Kopano's login email was not provided in the activation request.

The app's current login form uses:

```text
/login
Supabase Auth email + password
```

Because the existing architecture does not support phone-only login, I did not create a synthetic/fake email identity. That keeps the activation clean and avoids a future password-recovery or identity mismatch problem.

## Role assignment

| Field | Value |
| --- | --- |
| Organization | Libertalia Properties |
| Organization id | `2110c1e8-933e-46c4-8aaf-17ed03a12ae1` |
| Requested role | `member` |
| Membership row | **Pending — Supabase Auth user id required** |
| Membership status | Pending |

Planned membership assignment once login email exists:

```sql
insert into public.organization_members (organization_id, user_id, role, status)
select
  o.id,
  p.id,
  'member',
  'active'
from public.organizations o
join public.profiles p on lower(p.email) = lower('<KOPANO_LOGIN_EMAIL>')
where o.slug = 'libertalia-properties'
on conflict (organization_id, user_id) do update
set
  role = excluded.role,
  status = 'active';
```

No additional roles will be created.

## Login URL

Current public login URL returning HTTP 200:

```text
https://agentflow-ai-eta.vercel.app/login
```

Direct tenant route after successful login:

```text
https://agentflow-ai-eta.vercel.app/app/libertalia-properties/dashboard
```

If a newer protected Vercel preview is used instead, Kopano must be granted Vercel preview access or the deployment must be promoted/aliased before client onboarding. The public smoke URL above is the currently reachable client-facing login URL observed during activation.

## First-login procedure

After Kopano's login email is supplied and the Supabase Auth user is created:

1. Open:

```text
https://agentflow-ai-eta.vercel.app/login
```

2. Enter Kopano's login email.
3. Enter the temporary password created through Supabase Auth.
4. Submit the login form.
5. AgentFlow redirects to `/select-organization`.
6. Because Kopano should have one active membership, AgentFlow should route to:

```text
/app/libertalia-properties/dashboard
```

7. If organization selection appears, choose **Libertalia Properties**.
8. Confirm Kopano can open:
   - `/app/libertalia-properties/dashboard`
   - `/app/libertalia-properties/leads`
   - `/app/libertalia-properties/tasks`
   - `/app/libertalia-properties/inbox`
   - `/app/libertalia-properties/approvals`

## Password setup procedure

Current architecture supports Supabase Auth email/password login only.

There is no in-app password setup/reset page yet, so the safe existing procedure is:

1. Create Kopano in Supabase Auth using the supplied login email.
2. Set a strong temporary password through Supabase Auth admin tooling.
3. Mark/confirm the user email as confirmed if using manual admin creation.
4. Ensure the profile row exists with:
   - `full_name = 'Kopano Nkotsi'`
   - `email = '<KOPANO_LOGIN_EMAIL>'`
   - `is_platform_admin = false`
5. Assign Kopano to `libertalia-properties` with `role = 'member'` and `status = 'active'`.
6. Share the temporary password with Kopano through a secure out-of-band channel.
7. For future password rotation, use Supabase Auth admin tooling until the product has a canonical password reset/change screen.

Do not create a custom password flow for this activation.

## Completion verification already performed

- Confirmed no existing `libertalia-properties` organization before activation.
- Created/activated `public.organizations` row for Libertalia Properties.
- Created `public.organization_branding` row with safe placeholder colors.
- Confirmed default pipeline stages are present: 6.
- Confirmed no existing Kopano user by supplied phone/name pattern in `auth.users`.
- Confirmed current public login URL returns HTTP 200.

## Pending input required to finish activation

Required from Kaylyn / client:

```text
Kopano Nkotsi login email: <required>
```

Once supplied, the remaining activation steps are:

1. Create Kopano Supabase Auth user.
2. Verify/repair `public.profiles` row.
3. Add `organization_members` row with `role = 'member'`, `status = 'active'`.
4. Update this report with:
   - Supabase Auth user id
   - Profile id
   - Membership id
   - Final role assignment proof

## Architecture compliance

- No canonical architecture changes made.
- No code changes made.
- No additional roles created.
- No custom auth system created.
- Existing Supabase Auth + `organization_members` model preserved.
