# Phase 11A — Kopano Access Recovery Report

**Created:** 2026-06-19 UTC  
**Gate:** G03 — Kopano Final Reset and Production Login  
**Current status:** `WAITING ON KOPANO`

## Scope

Complete Kopano Nkotsi's final production credential reset through the safe Supabase recovery path, without Nova/Gen I Labs inventing, requesting, storing, or seeing Kopano's final password.

## Precheck Evidence

Evidence file: `evidence/g03_kopano_precheck.txt`

Verified facts:

| Item | Result |
| --- | --- |
| Approved email identity | `kopano@libertaliaproperties.co.za` |
| Supabase Auth user id | `196bd175-95ef-42f6-ad4a-ea49a86209a4` |
| Email/account confirmation | Confirmed |
| Deleted/banned state | Not deleted, not currently banned |
| Auth identity provider | Email |
| Invitation-state blocker | No active invitation blocker detected |
| Prior sign-in history | Present |
| Tenant membership | `libertalia-properties` |
| Organization status | `active` |
| Membership role/status | `member` / `active` |
| Platform admin | `false` |

## Recovery Request

Evidence file: `evidence/g03_recovery_email_request.txt`

- Recovery path used: Supabase `resetPasswordForEmail`.
- Recipient: `kopano@libertaliaproperties.co.za`.
- Redirect destination: `https://app.genilabs.co.za/auth/callback?next=/reset-password`.
- Request result: `NO_ERROR`.
- Secret handling: no password, reset link, access token, refresh token, or recovery token logged.

## Human Checkpoint

Who must act: Kopano Nkotsi.

Exact action required:

1. Kopano opens the password recovery email sent to `kopano@libertaliaproperties.co.za`.
2. Kopano uses only the link in that email.
3. Kopano sets his own final password privately.
4. Kopano logs in at `https://app.genilabs.co.za/login`.
5. Kopano confirms successful production login.

What must not be shared:

- Final password.
- Reset link.
- Session token.
- Screenshots containing private links or tokens.

Confirmation text requested:

`Kopano final reset complete and production login succeeded.`

## Nova Validation After Confirmation

After founder/Kopano confirmation, Nova will reopen the master plan and state ledger, then validate G03 completion using safe non-secret evidence before proceeding to G04:

- Confirm user remains active, confirmed, not banned/deleted.
- Confirm `last_sign_in_at` advanced after the recovery request timestamp or otherwise obtain supervised non-secret confirmation.
- Confirm production app access proceeds to the correct tenant path without using founder login or temporary credential as substitute evidence.

## Current Decision

G03 is not passed yet. It is `WAITING ON KOPANO` until Kopano completes the final reset and production login.
