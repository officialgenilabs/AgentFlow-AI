# Phase 11A — WhatsApp Pairing Report

**Timestamp:** 2026-06-19 UTC
**Mode:** QR-generation readiness only.
**Status:** `NOT STARTED / REVALIDATION REQUIRED`
**Scope guard:** No QR contents exposed, no WhatsApp pairing attempted, no test messages sent.

## 1. Pairing State

WhatsApp pairing was intentionally **not performed**.

Reason:

- G03 remains `WAITING ON KOPANO`.
- G06 Evolution public-route precheck is blocked by `503 no available server` on the public `/evolution/` route.
- Founder scan is required for pairing.
- The user explicitly prohibited pairing during this waiting window.

## 2. QR Readiness Attempt

The safe QR endpoint probe was limited to API-readiness only:

- Endpoint probed: `/instance/connect/AgentFlow_Primary`
- Result: public route fetch failed / curl returned `503 no available server` through the configured public Evolution route.
- QR/code fields were redacted by the probe logic.
- No QR image/code was displayed or stored.
- No device was paired.

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

Current state: **REVALIDATION REQUIRED after G06 route and Libertalia instance/channel mapping are fixed.**
