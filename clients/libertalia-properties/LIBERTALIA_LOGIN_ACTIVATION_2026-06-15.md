# Libertalia Properties — Kopano Login Activation

**Date:** 2026-06-15 15:16 UTC
**Client:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Login email:** `kopano@libertaliaproperties.co.za`
**Tenant slug:** `libertalia-properties`
**Org ID:** `2110c1e8-933e-46c4-8aaf-17ed03a12ae1`
**Auth/Profile ID:** `196bd175-95ef-42f6-ad4a-ea49a86209a4`
**Membership ID:** `0dd28468-adb7-444e-abb4-9d58f945285a`
**Role:** `member`
**Status:** Active and login-verified

## What changed

- Created Kopano as a Supabase Auth email/password user.
- Confirmed email/auth user is active.
- Verified profile exists with `is_platform_admin = false`.
- Linked Kopano to Libertalia Properties through `public.organization_members`.
- Verified Supabase Auth login succeeds and issues a session.

## Login

```text
https://agentflow-ai-eta.vercel.app/login
```

Expected post-login route:

```text
/app/libertalia-properties/dashboard
```

## Password handling

Temporary credentials are stored outside git at:

```text
/home/genilabs/.openclaw/credentials/libertalia-kopano-login.env
```

Do not commit passwords or secrets to the repo or Vault.

Current product limitation: AgentFlow does not yet have an in-app self-service password-change screen. Password rotation is currently Supabase Dashboard/Auth-admin assisted.

## Still pending for full go-live

- Property24 profile URL and lead destination email.
- Property24 parser bridge to signed JSON ingress.
- Evolution/WhatsApp instance certification.
- Inbound/outbound smoke tests before live WhatsApp sending.
