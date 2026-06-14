# Libertalia User Activation Plan

## Executive answer

AgentFlow **does support client logins today** through Supabase Auth + tenant membership records.

However, the current implementation is **controlled onboarding only**:

- No public self-signup flow exists.
- No in-app user invitation/user-management screen exists.
- No in-app password setup/reset screen exists.
- The app supports email + password login through `/login`.
- Tenant access is granted by `public.organization_members`.
- The least available tenant role is `member`, but `member` is **not read-only** in the current canonical schema; active members can view and update tenant CRM records allowed by RLS.

Current live staging check found **no existing Libertalia tenant** and **no existing Kopano/Kopano-Libertalia auth/profile record**. Activation should therefore be a controlled founder/operator setup, not a public onboarding link.

## Evidence inspected

Repository: `/opt/agentflow_memory/nova/agentflow-ai`

Relevant implementation points:

- Login UI: `src/app/login/page.tsx`
- Login action: `src/features/auth/login-form.tsx`
  - Uses `supabase.auth.signInWithPassword({ email, password })`.
- Auth callback: `src/app/auth/callback/route.ts`
  - Exchanges Supabase auth code and redirects to `/select-organization` or `/admin/dashboard` for platform admins.
- Tenant/profile access logic: `src/lib/data/auth.ts`
  - Requires an authenticated Supabase user.
  - Loads `public.profiles`.
  - Resolves active memberships from `public.organization_members`.
  - Redirects single-org non-platform users directly to `/app/:orgSlug/dashboard`.
- Tenant schema/RLS: `supabase/migrations/20260429_stage_a_multi_tenant_core.sql`
  - `profiles`
  - `organizations`
  - `organization_members`
  - roles: `owner`, `admin`, `member`
  - statuses: `active`, `invited`, `disabled`
- CRM schema/RLS: `supabase/migrations/20260429_stage_b_crm_core.sql`
  - active organization members can select/insert/update leads, lead notes, and lead tasks.
- Client routes:
  - Dashboard: `/app/:orgSlug/dashboard`
  - Leads: `/app/:orgSlug/leads`
  - Lead detail + qualification state: `/app/:orgSlug/leads/:leadId`
  - Tasks: `/app/:orgSlug/tasks`
  - Inbox: `/app/:orgSlug/inbox`
  - Approvals: `/app/:orgSlug/approvals`
  - Routing/Governance views: `/app/:orgSlug/routing`, `/app/:orgSlug/governance`

## Current support status

### 1. Does AgentFlow currently support client logins?

**Yes — with caveats.**

Supported:

- Supabase Auth email/password user login.
- Authenticated tenant routing.
- Per-tenant membership gating.
- Client access to tenant dashboards, leads, tasks, inbox, approvals, routing, and governance pages once membership is active.

Not currently supported:

- Public self-registration.
- In-app invitation acceptance.
- In-app password creation/reset.
- Read-only client role.
- In-app user/member administration.
- Native mobile app login.

## Recommended Kopano activation path

Use the current canonical architecture exactly as-is:

1. Create or confirm the Libertalia tenant.
2. Create Kopano as a Supabase Auth user.
3. Confirm/repair Kopano's `public.profiles` row.
4. Add Kopano to Libertalia through `public.organization_members`.
5. Use `member` role unless Kopano needs admin-level tenant controls.
6. Have Kopano log in at `/login` using email + password.
7. Verify access to leads, tasks, and qualification workflow.

No code changes. No architecture changes.

## Exact user creation process

### Preferred process: Supabase Dashboard

1. Open the canonical AgentFlow Supabase project.
2. Go to **Authentication → Users**.
3. Click **Add user / Create user**.
4. Enter Kopano's email address.
5. Set a strong temporary password.
6. Enable/confirm email if the dashboard offers that option.
7. Add user metadata if available:

```json
{
  "full_name": "Kopano Nkotsi"
}
```

8. Save the user.
9. Copy the generated Auth user UUID.

The Stage A trigger `app_private.handle_new_user()` should create a matching `public.profiles` row automatically.

### Profile verification / repair SQL

Run only after the Auth user exists:

```sql
insert into public.profiles (id, full_name, email, is_platform_admin)
select
  u.id,
  'Kopano Nkotsi',
  u.email,
  false
from auth.users u
where lower(u.email) = lower('<KOPANO_EMAIL>')
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  is_platform_admin = false,
  updated_at = now();
```

Do **not** make Kopano a platform admin.

## Exact tenant creation process

Current live staging inspection found no Libertalia tenant. If it is still absent at activation time, create it first.

### Preferred process: AgentFlow founder UI

1. Log in as a platform admin/founder.
2. Open `/admin/dashboard`.
3. Click **Configure New Tenant** or open `/admin/tenants/new`.
4. Create:
   - Organization name: `Libertalia`
   - Slug: `libertalia`
   - Plan: current UI defaults to `starter`
   - Status: current route creates it as `active`
5. Confirm the tenant appears under `/admin/tenants`.

This path preserves the existing app flow, creates branding defaults, records an audit log, and lets the existing organization trigger seed default pipeline stages.

### Verification SQL

```sql
select id, name, slug, status, plan
from public.organizations
where slug = 'libertalia';
```

Expected result: one `active` organization row.

## Exact role assignment process

Assign Kopano to the Libertalia tenant through `public.organization_members`.

### Recommended role

Use:

- `role = 'member'`
- `status = 'active'`

Reason: `member` is the lowest available current role and is enough to access the client workspace.

Important caveat: `member` is **not read-only**. Current RLS allows active members to insert/update leads, notes, and tasks. If Kopano must have strictly read-only access, the current product does **not** support that without a future role/RLS/UI change.

### Membership SQL

```sql
insert into public.organization_members (organization_id, user_id, role, status)
select
  o.id,
  p.id,
  'member',
  'active'
from public.organizations o
join public.profiles p on lower(p.email) = lower('<KOPANO_EMAIL>')
where o.slug = 'libertalia'
on conflict (organization_id, user_id) do update
set
  role = excluded.role,
  status = 'active';
```

### Membership verification SQL

```sql
select
  p.full_name,
  p.email,
  o.name as organization,
  o.slug,
  om.role,
  om.status
from public.organization_members om
join public.profiles p on p.id = om.user_id
join public.organizations o on o.id = om.organization_id
where lower(p.email) = lower('<KOPANO_EMAIL>')
  and o.slug = 'libertalia';
```

Expected result:

- `full_name = Kopano Nkotsi`
- `organization = Libertalia`
- `slug = libertalia`
- `role = member`
- `status = active`

## Exact first login process

1. Send Kopano the active AgentFlow pilot URL.
2. Kopano opens:

```text
<AGENTFLOW_APP_URL>/login
```

3. Kopano enters:
   - Email: `<KOPANO_EMAIL>`
   - Password: the temporary/current password set in Supabase Auth
4. The app calls Supabase email/password auth.
5. On success, the app redirects to `/select-organization`.
6. Because Kopano should only have one active organization membership, the app should automatically redirect to:

```text
/app/libertalia/dashboard
```

7. If Kopano remains on organization selection, choose **Libertalia**.
8. If Kopano sees **No active organization memberships**, the `organization_members` row is missing, disabled, or tied to the wrong Auth user.
9. If Kopano sees `profile-required`, repair the `public.profiles` row using the profile SQL above.

## Exact password setup process

Current app reality:

- Password login exists.
- Public signup does not exist.
- In-app password setup does not exist.
- In-app password reset/change does not exist.

Therefore the safe current process is:

1. Founder/operator creates the Auth user in Supabase.
2. Founder/operator sets a strong temporary password.
3. Share the password with Kopano through a secure out-of-band channel.
4. Kopano logs in once and confirms access.
5. If password rotation is required, rotate it from Supabase Dashboard/Auth admin tooling.

Do not rely on an app-based "forgot password" flow for this pilot. The repository currently contains no reset-password page and no `updateUser({ password })` implementation.

## Exact mobile login process

There is no native mobile app. Mobile access is through the responsive web app.

1. Kopano opens the active AgentFlow pilot URL in mobile Safari/Chrome.
2. Navigate to:

```text
<AGENTFLOW_APP_URL>/login
```

3. Enter the same email/password credentials.
4. After login, Kopano lands on the Libertalia dashboard or organization selector.
5. Use the hamburger menu to access:
   - **Operations Cockpit** → `/app/libertalia/dashboard`
   - **Context Memory Ledger** → `/app/libertalia/leads`
   - **Operator Follow-ups** → `/app/libertalia/tasks`
   - **Governed Inbound Queue** → `/app/libertalia/inbox`
   - **Governed Approvals** → `/app/libertalia/approvals`
   - **Synthetic Routing Flow** → `/app/libertalia/routing`
6. Avoid shared mobile browsers/devices. The current shell does not expose a visible sign-out button.

## Viewing Kopano's leads

After login:

```text
/app/libertalia/leads
```

This page shows:

- lead name
- contact/company summary
- status
- qualification status
- priority
- identity confidence
- source attribution
- inbound channel
- assigned owner
- captured date

Open any lead:

```text
/app/libertalia/leads/<leadId>
```

The lead detail page shows:

- operational state
- assigned owner
- qualification state
- pipeline stage
- priority
- source and identity integrity
- notes
- lead-specific tasks
- chronological lead event ledger

## Viewing Kopano's tasks

After login:

```text
/app/libertalia/tasks
```

This page shows:

- task title
- priority
- due date
- linked lead
- assigned owner
- task status

Current members can update task status from this screen. If Kopano should only observe tasks, treat this as a pilot governance instruction, because the app does not yet enforce read-only access.

## Viewing qualification workflow

Primary route:

```text
/app/libertalia/leads/<leadId>
```

Relevant sections:

- **Qualification State** KPI card
- **State & Assignment Governance** form
- **AI Qualification Decision Path Log**
- **Lead Origin Chronological Ledger**

Supporting routes:

```text
/app/libertalia/routing
/app/libertalia/approvals
/app/libertalia/inbox
/app/libertalia/governance
```

Use these to explain the broader flow:

1. Lead enters through manual capture or inbound channel.
2. Source integrity fields are preserved.
3. Identity confidence is normalized from email/phone.
4. Lead status and qualification status are tracked.
5. AI/human qualification decisions are recorded in the decision path log.
6. State changes generate event ledger entries.
7. Draft outbound responses, when present, are reviewed in the approvals queue.

## Fastest safe path if strict read-only access is required

If Kopano must only view and must not be able to mutate records, do **not** issue normal tenant credentials yet.

Current architecture has no read-only client role. The safest no-code/no-architecture options are:

1. Founder/operator guided walkthrough using an existing authorized account over a call.
2. Export or screenshot the relevant lead/task/qualification views for Kopano.
3. Use a temporary `member` login only if Kopano is trusted for pilot access and understands that the current UI can update records.

Recommended pilot compromise:

- Use `member` role.
- Keep the pilot in staging or a controlled tenant.
- Limit the pilot data to Libertalia only.
- Monitor audit logs.
- Disable the membership immediately after the pilot if needed.

## Disable / revoke access

To revoke Kopano's tenant access without deleting the Auth user:

```sql
update public.organization_members om
set status = 'disabled'
from public.profiles p, public.organizations o
where om.user_id = p.id
  and om.organization_id = o.id
  and lower(p.email) = lower('<KOPANO_EMAIL>')
  and o.slug = 'libertalia';
```

To fully disable login, also disable or remove the Auth user in Supabase Authentication.

## Activation checklist

Before sending credentials:

- [ ] Libertalia tenant exists and is `active`.
- [ ] Kopano Auth user exists.
- [ ] Kopano profile exists with `is_platform_admin = false`.
- [ ] Kopano has `organization_members.role = 'member'` and `status = 'active'` for `libertalia`.
- [ ] Default pipeline stages exist for Libertalia.
- [ ] At least one Libertalia lead exists, or the pilot script explains the empty state.
- [ ] At least one task exists if task viewing is part of the pilot.
- [ ] Qualification status / decision path is populated on demo leads if qualification workflow is being shown.
- [ ] Desktop login tested in an incognito browser.
- [ ] Mobile login tested in Safari/Chrome.
- [ ] Cross-tenant access checked by attempting another org URL and confirming redirect/denial.

## Final recommendation

Proceed with **controlled client login activation** for Kopano using Supabase Auth + `organization_members`.

Use `member` role for the Libertalia pilot, but treat it as an operational-access pilot rather than read-only client access. If read-only access becomes a hard requirement, that will require a future canonical product change; it should not be patched ad hoc for this activation.
