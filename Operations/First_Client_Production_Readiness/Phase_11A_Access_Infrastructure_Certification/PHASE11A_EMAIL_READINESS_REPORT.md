# Phase 11A — Email / Property24 Forwarding Readiness Precheck

**Timestamp:** 2026-06-19 UTC
**Mode:** Infrastructure readiness only; no signed lead ingestion and no production data write.
**Status:** `PRECHECK PASS WITH EXTERNAL SETUP REQUIRED` / `REVALIDATION REQUIRED`

## 1. Executive Status

| Area | Status | Notes |
|---|---:|---|
| Production Property24 endpoint present | PRECHECK PASS | `POST /api/ingress/property24` exists in production source. |
| Unsigned request guard | PRECHECK PASS | Unsigned production POST returned `401 signed_ingress_required`. |
| Vercel production env presence | PRECHECK PASS | Prior G01 evidence shows `PROPERTY24_INGRESS_SECRET`, `PROPERTY24_DEFAULT_ORG_SLUG`, Supabase URL/anon keys present in production env metadata; values redacted. |
| Signed parser bridge | NOT VERIFIED | No parser/forwarding service was found as active/live in this safe precheck. |
| Libertalia mailbox/Property24 source | WAITING ON FOUNDER/KOPANO | Profile URL, account/admin holder, current enquiry destination email, and sample lead email are still required. |
| Signed happy-path ingestion | NOT EXECUTED | Deliberately not run to avoid creating production data before full readiness. |

## 2. Evidence

Evidence files:

- `evidence/g09_email_infra_source_doc_search.txt`
- `evidence/g09_property24_production_guard_check.txt`
- `evidence/g01_vercel_project_summary.json`

Production guard check:

- Request: unsigned `POST https://app.genilabs.co.za/api/ingress/property24` with `{}`
- Result: `401`
- Body: `{"ok":false,"error":"signed_ingress_required"}`
- Mutation attempted: no
- Signed payload sent: no

## 3. Source Route Behavior

The production route source at `src/app/api/ingress/property24/route.ts` enforces:

1. `PROPERTY24_INGRESS_SECRET` must exist.
2. `x-agentflow-timestamp` and `x-agentflow-signature` are required.
3. Timestamp skew is enforced (`PROPERTY24_INGRESS_SKEW_SECONDS`, default `300`).
4. HMAC-SHA256 over `<timestamp>.<raw_json_body>` is verified via `timingSafeEqual`.
5. The route normalizes payload into canonical fields.
6. It calls `public.ingest_property24_lead(...)` through Supabase.
7. Duplicate replay keys return `409 duplicate_ingress_replay_key` instead of creating duplicate records.

## 4. Property24 / Email Forwarding Architecture

Client docs show the intended path:

```text
Property24 enquiry email
  → pilot email parser / forwarding bridge
  → signed JSON POST to /api/ingress/property24
  → public.ingest_property24_lead(...)
  → lead + conversation + message + audit/automation records
```

Relevant client docs:

- `clients/libertalia-properties/LIBERTALIA_PROPERTY24_INTAKE_SETUP.md`
- `clients/libertalia-properties/LIBERTALIA_GO_LIVE_CHECKLIST.md`
- `clients/libertalia-properties/LIBERTALIA_ONBOARDING_CHECKLIST.md`

## 5. External Setup Still Required

Founder/Kopano/mailbox admin must confirm or provide:

1. Libertalia Property24 profile URL.
2. Property24 account/admin access holder.
3. Current Property24 enquiry destination email.
4. Approved forwarding destination / parser bridge address.
5. A real or representative sample Property24 enquiry email.
6. Confirmation that forwarding preserves original body and headers required by parser logic.

## 6. Gate Result

G09 Email-forwarding readiness: **REVALIDATION REQUIRED**.

Infrastructure guard is live, but full readiness cannot pass until mailbox/Property24 forwarding is configured and a signed parser bridge test is executed with authorized sample data.
