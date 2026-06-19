# Phase 11A — WhatsApp Pairing Report

**Timestamp:** 2026-06-19 UTC
**Mode:** QR-generation readiness only.
**Status:** `REVALIDATION REQUIRED` — canonical route and QR/connect endpoint reachable; no pairing attempted
**Scope guard:** No QR contents exposed, no WhatsApp pairing attempted, no test messages sent.

## 1. Pairing State

WhatsApp pairing was intentionally **not performed**.

Reason:

- G03 remains `WAITING ON KOPANO`.
- G06 canonical Evolution route is now technically reachable, but correct Libertalia instance/account confirmation is still required.
- Founder scan is required for pairing.
- The user explicitly prohibited pairing during this waiting window.

## 2. QR Readiness Attempt

The safe QR endpoint probe was limited to API-readiness only:

- Endpoint probed after route remediation: `https://flows.genilabs.co.za/evolution/instance/connect/AgentFlow_Primary`
- Result: authenticated public request returned `200` with `state=open`.
- No QR image/code was displayed, stored, or required because the visible instance is already open.
- No device was paired.
- Correct Libertalia instance/account decision remains unresolved before any future QR action.

Evidence:

- `evidence/g06_evolution_precheck.json`
- `evidence/g06_evolution_local_health.txt`

## 3. Required Pairing Preconditions

Before QR pairing can begin:

1. G06 public Evolution route must be reachable.
2. The target WhatsApp instance must be explicitly identified for Libertalia:
   - preferred: a dedicated Libertalia instance; or
   - documented pilot exception using `AgentFlow_Primary` with safe tenant mapping.
3. The corresponding `channels` row must map the Evolution instance to `libertalia-properties`, not demo tenants.
4. Founder must be present and ready to scan the QR.
5. Nova must display/generate QR only in the live pairing window and must not store QR payloads.

## 4. Gate Result

G07 / WhatsApp Pairing: **NOT PASSED**.

Current state: **REVALIDATION REQUIRED after Libertalia instance/channel mapping is confirmed and founder authorizes pairing.**
## 5. 2026-06-19 G06 Route Remediation Impact

The canonical Evolution public route is now reachable through `https://flows.genilabs.co.za/evolution/` with API-key enforcement. QR/connect readiness is technically reachable for `AgentFlow_Primary` and returns `state=open`.

This does **not** pass WhatsApp pairing:

- No QR was exposed.
- No scan was requested.
- No device was paired.
- No WhatsApp message was sent.
- No Libertalia-named Evolution instance is visible yet.

Next required decision: founder must confirm whether `AgentFlow_Primary` is the approved Libertalia pilot instance or whether Nova should prepare a dedicated Libertalia instance before pairing.
