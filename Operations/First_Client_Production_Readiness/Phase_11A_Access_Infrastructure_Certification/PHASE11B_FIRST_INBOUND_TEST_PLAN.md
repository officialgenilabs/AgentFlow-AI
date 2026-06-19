# Phase 11B — First Inbound Three-Message Test Plan

**Timestamp:** 2026-06-19 UTC
**Status:** Prepared only — **DO NOT EXECUTE**
**Execution Blockers:** G03, G04, G05, G06, G07, G08, G09, G10 not fully passed.

## 1. Purpose

Validate the first real Libertalia inbound pipeline after Phase 11A gates pass:

1. inbound capture,
2. tenant attribution,
3. lead identity/deduplication,
4. conversation threading,
5. message persistence,
6. dashboard visibility,
7. draft/governance posture,
8. no unauthorized outbound behavior.

## 2. Hard Preconditions

Do not execute this test until all are true:

1. G03 — Kopano completed private password reset and confirmed production login.
2. G04 — Kopano's Libertalia tenant permissions are certified.
3. G05 — Desktop/mobile operator access is certified or supervised.
4. G06 — Evolution public route and Libertalia instance are certified.
5. G07 — WhatsApp is paired by founder scan and connected.
6. G08 — n8n webhook mapping is revalidated against the live connected instance.
7. G09 — Email/Property24 path is either certified or explicitly out of scope for the WhatsApp-only first test.
8. G10 — Activation gate scorecard is updated to ready.
9. Founder explicitly authorizes Phase 11B execution window, sender number, and exact message content.

## 3. Test Actors

| Actor | Role |
|---|---|
| Founder | Authorizes execution window, supervises WhatsApp sender/device if needed. |
| Kopano | Confirms operator dashboard visibility where needed; does not share password. |
| Nova | Executes inspection, records evidence, does not send outbound unless separately authorized in later phase. |
| Test sender | Sends three inbound messages from an approved non-client test number. |

## 4. Proposed Three Messages

Use an approved test sender number only. Do not use a real lead without consent.

### Message 1 — New lead creation

```text
Hi Libertalia, I'm interested in viewing the Sea Point apartment listed this week. Is it still available?
```

Expected:

- New inbound message captured.
- New or matched lead created under `libertalia-properties` only.
- Conversation created or matched under Libertalia channel.
- Message direction is `inbound`.
- Exact source metadata includes WhatsApp/Evolution channel.
- No outbound send occurs.

### Message 2 — Thread continuity

```text
My budget is around R2.8m and I can view after 5pm tomorrow.
```

Expected:

- Same conversation thread as Message 1.
- Same lead or correctly matched identity.
- Qualification/context fields update or draft context includes budget/viewing time.
- No duplicate lead created.
- No outbound send occurs.

### Message 3 — Deduplication / context enrichment

```text
Also, my name is Test Buyer and you can reach me on this WhatsApp number.
```

Expected:

- Same thread/lead remains active.
- Message persists with stable external id.
- If replayed intentionally later with same external id/idempotency key, duplicate prevention should block duplicate message creation.
- No unauthorized outbound send occurs.

## 5. Evidence to Capture During Execution

Before messages:

- Evolution instance connection state.
- n8n workflow active/version id.
- Libertalia channel row.
- Current counts for Libertalia leads/conversations/messages/automation_events/drafts.

After each message:

- n8n execution id/status.
- New/updated Supabase rows, redacted for PII.
- Tenant slug and organization id.
- Channel id and external channel id.
- Conversation id and external conversation id.
- Lead id and identity confidence/match rule if present.
- Message id/external message id/direction/status.
- Any automation event or draft generated.
- Confirmation that no outbound send occurred.

After all messages:

- Kopano dashboard visibility confirmation.
- Duplicate/threading verdict.
- Final Phase 11B go/no-go recommendation.

## 6. Rollback / Stop Conditions

Stop immediately if any occurs:

1. Message lands outside `libertalia-properties`.
2. Duplicate lead is created from same sender/context unexpectedly.
3. Any outbound message is sent without explicit separate authorization.
4. n8n execution errors repeatedly.
5. Evolution instance disconnects.
6. Kopano cannot see expected records after G03/G04/G05 were supposedly passed.

## 7. Current Status

Prepared only. **Not executed.**
