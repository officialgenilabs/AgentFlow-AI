# OUTBOUND_TRANSPORT_ROOT_CAUSE.md

## Executive summary

Outbound is **not currently certifiable for production demonstration**.

The live approval path does reach AgentFlow's governed outbound code, prepares the DB send, and calls Evolution directly. It does **not** use an outbound n8n workflow. The current real send attempt failed at the Evolution outbound endpoint:

```text
POST /message/sendText/AgentFlow_Primary -> HTTP 500
Evolution response: Cannot read properties of undefined (reading 'onWhatsApp')
AgentFlow DB status: failed
```

There is also a product-state problem: AgentFlow treats a successful Evolution HTTP response as `sent`, even when Evolution only returns a WhatsApp/Baileys `PENDING` send object. That is **not proof of recipient delivery**. The UI copy can therefore overstate delivery if the Evolution API accepts/queues a message but WhatsApp never confirms delivery.

## Expected outbound path

Business/operator expectation:

1. Operator approves AI draft in AgentFlow.
2. AgentFlow records human approval and creates/updates outbound message state.
3. Outbound dispatcher sends the message to transport.
4. Transport sends through WhatsApp.
5. Delivery/failed receipt returns from Evolution/WhatsApp.
6. AgentFlow updates DB/UI based on actual transport result.

Originally expected audit path from the request:

```text
AgentFlow UI approval
  -> DB draft/message state
  -> n8n outbound workflow
  -> Evolution outbound endpoint
  -> WhatsApp transmission
  -> delivery logs/receipts
  -> DB/UI final state
```

## Actual outbound path found

Current code path is direct AgentFlow server-side dispatch, not n8n:

```text
AgentFlow approvals form
  -> src/features/approvals/actions.ts::reviewAiMessageDraft
  -> Supabase RPC review_ai_message_draft
  -> if OUTBOUND_TRANSPORT_ENABLED=true:
       Supabase RPC send_outbound_message(action='prepare')
  -> src/lib/evolution.ts::sendEvolutionTextMessage
  -> POST {EVOLUTION_API_BASE_URL}/message/sendText/{instance}
  -> if HTTP error:
       send_outbound_message(action='finalize', delivery_status='failed')
       redirect ?error=send-failed-manual-retry
     else:
       send_outbound_message(action='finalize', delivery_status='sent')
       redirect ?sent=1
```

Code evidence:

- `src/features/approvals/actions.ts:67` enables send only when status is `approved` and `OUTBOUND_TRANSPORT_ENABLED === "true"`.
- `src/features/approvals/actions.ts:95-99` calls `send_outbound_message(... action='prepare' ...)`.
- `src/features/approvals/actions.ts:106-112` calls `sendEvolutionTextMessage(...)` directly.
- `src/features/approvals/actions.ts:113-125` finalizes DB as failed when Evolution throws.
- `src/features/approvals/actions.ts:128-141` finalizes DB as `sent` and redirects `?sent=1` after a non-error Evolution HTTP response.
- `src/lib/evolution.ts:102-111` posts directly to `/message/sendText/{instance}` with body `{ number, textMessage: { text } }`.
- `src/app/app/[orgSlug]/approvals/page.tsx:60-63` displays `Approved outbound message delivered...` when `?sent=1`; this copy overclaims actual delivery.

## n8n audit result

n8n is **not the outbound path** for the current approval action.

Evidence collected:

- Active AgentFlow n8n workflow inspected during this audit is inbound-only:
  - `Evolution Inbound Webhook -> Normalize -> Call Canonical Ingestion RPC`.
- n8n execution list returned no outbound execution records.
- Current code path imports/calls `sendEvolutionTextMessage` directly from the Next.js server action.

Conclusion: outbound is not failing before Evolution in n8n. There is no outbound n8n execution to fail.

## Database state transitions observed

Latest real outbound attempt:

```text
message_id: e2865de4-01cf-48e7-b47f-de9b920bbdc2
created_at: 2026-06-09T08:15:22.313Z
occurred_at: 2026-06-09T08:15:27.584Z
channel: AgentFlow Primary WhatsApp
provider: evolution
external_channel_id / instance: AgentFlow_Primary
recipient_last4: 5990
status: failed
sent_at: null
external_message_id: null
raw_payload.delivery_status: failed
raw_payload.last_error: evolution_send_failed_500
```

Stored Evolution response:

```json
{
  "status": 500,
  "error": "Internal Server Error",
  "response": {
    "message": "Cannot read properties of undefined (reading 'onWhatsApp')"
  }
}
```

Automation/audit trail evidence:

```text
2026-06-09T08:15:27.459Z draft.approved processed
2026-06-09T08:15:28.588Z message.failed failed
error: evolution_send_failed_500
transport: evolution
```

This means the latest audited real approval did **not** successfully reach a WhatsApp send. It was rejected/failed inside Evolution and AgentFlow finalized it as failed.

Historical `sent` example found:

```text
message_id: 6e64cd54-4316-44f3-855d-3d7b7184c78a
status: sent
sent_at: 2026-04-30T19:45:36.457Z
external_message_id: 3EB0B572182E4E7BC29AD2
Evolution response status: PENDING
```

Important: `PENDING` from Evolution/Baileys is not a recipient delivery receipt. AgentFlow marked this as `sent` because Evolution returned HTTP success and an external message id, not because WhatsApp confirmed recipient delivery.

## Evolution / WhatsApp transport evidence

Evidence collected:

- Evolution container is running and inbound events are still received.
- Inbound messages arrive through Evolution and n8n, proving inbound webhook transport works.
- Prior state check showed `AgentFlow_Primary` connection state as `close`.
- Latest outbound send returned Evolution HTTP 500 with `onWhatsApp` undefined.
- Recent Evolution logs show unstable Baileys/WhatsApp session symptoms, including:
  - `Connection Terminated by Server`
  - `Connection Failure`
  - `Stream Errored (restart required)`
  - `Log out instance: AgentFlow_Primary`
  - `PreKeyError: Invalid PreKey ID`
  - `SessionError: No session record`
- `POST /chat/findMessages/AgentFlow_Primary` returned `[]` during audit, so Evolution did not provide confirmable recent outbound delivery evidence through that query.

WhatsApp transmission status:

- Latest audited attempt: **not transmitted**; no external message id was created.
- Historical accepted attempt: **submitted/pending only**, not proven delivered.

## Exact failure point

Primary current failure point:

```text
AgentFlow -> Evolution POST /message/sendText/AgentFlow_Primary
```

The Evolution API returned:

```text
HTTP 500: Cannot read properties of undefined (reading 'onWhatsApp')
```

Likely operational cause:

- `AgentFlow_Primary` is not in a healthy connected/send-capable WhatsApp session.
- Evolution/Baileys state is unstable or partially logged out; inbound can still appear for a period, but outbound send cannot reliably execute.

Secondary application correctness issue:

- AgentFlow's `sent` state currently means **Evolution HTTP accepted/finalized**, not **WhatsApp delivered to recipient**.
- The approvals success copy says `delivered`, which is stronger than the evidence supports.

## Determinations

### Where outbound execution stops

Current attempt stops at Evolution's `sendText` endpoint before WhatsApp transmission.

### Is transport disabled by design?

Partially/environment-dependent.

- The code intentionally freezes outbound unless `OUTBOUND_TRANSPORT_ENABLED=true`.
- The audited send did proceed to Evolution, so transport was enabled in the environment used for the test.
- Earlier environment inspection found Vercel Production lacked outbound/Evolution env vars while Preview branch `phase-10/backend-operationalization` had outbound config. A production deployment without those vars would remain frozen by design.

### Does Evolution reject sends?

Yes. The latest real send was rejected/failed by Evolution with HTTP 500.

### Does n8n fail before Evolution?

No. n8n is not part of the current outbound approval path.

### Does UI mark sent prematurely?

Yes, in the successful-response path.

- `src/features/approvals/actions.ts` finalizes `delivery_status='sent'` immediately after Evolution HTTP success.
- Historical Evolution response was `status: "PENDING"`, but AgentFlow stored `status='sent'`.
- `src/app/app/[orgSlug]/approvals/page.tsx` says `delivered`, but no delivery receipt is required before showing that copy.
- The inbox thread visually styles outbound messages as outbound/green; it does not render a true delivery receipt status.

For the latest 2026-06-09 attempt, DB says `failed`, not `sent`. If UI showed `SENT` for that exact attempt, it was stale/cached, pointed at an older outbound message, or interpreted the green outbound direction as delivery state.

## Required fix

### Immediate certification fix

1. Reconnect or rebuild `AgentFlow_Primary` in Evolution:
   - Confirm `/instance/connectionState/AgentFlow_Primary` returns connected/open.
   - If needed, clear/recreate the broken Baileys session and rescan WhatsApp QR.
   - Confirm no fresh `PreKeyError`, `SessionError`, `Stream Errored`, or `Log out instance` entries.
2. Run one controlled outbound smoke test to a known consenting test WhatsApp number.
3. Verify delivery on the receiving device, not only the AgentFlow DB.
4. Capture Evolution send response and delivery/update webhook evidence.

### Application hardening fix

1. Split outbound states:
   - `prepared`
   - `submitted_to_evolution`
   - `whatsapp_pending`
   - `delivered`
   - `read` where available
   - `failed`
2. Do not label Evolution HTTP success as `delivered`.
3. Store Evolution HTTP result as `submitted`/`pending` unless a delivery receipt confirms final delivery.
4. Add a pre-send Evolution health gate:
   - instance exists
   - connection state is open/connected
   - recipient is valid/on WhatsApp where supported
   - fail before DB `sent` finalization if the instance is closed/unhealthy
5. Add an inbound Evolution status/update webhook consumer for outbound message receipts.
6. Update UI copy:
   - `Submitted to WhatsApp transport` for HTTP success
   - `Delivered` only after receipt
   - visible `failed` state with retry action when Evolution returns non-2xx

### Optional architecture decision

If Gen I Labs wants n8n as the outbound dispatcher, add an explicit outbound n8n workflow and change the AgentFlow approval action to enqueue/trigger that workflow. Right now, adding/debugging n8n will not fix the current failure because n8n is not in the path.

## Estimated fix complexity

Immediate demo/certification recovery:

```text
Small to Medium: 30-90 minutes if QR/reconnect works cleanly.
Medium: 2-4 hours if Evolution session state must be destroyed/recreated and webhooks reattached.
```

Application correctness/hardening:

```text
Medium: 0.5-1.5 engineering days.
```

Full production-grade delivery receipt tracking:

```text
Medium to Large: 1-3 engineering days depending on Evolution receipt event shape, retry policy, and UI depth.
```

## Production readiness assessment

Current status: **NOT PRODUCTION READY for outbound WhatsApp.**

Reasons:

- Current Evolution outbound send fails with HTTP 500.
- `AgentFlow_Primary` shows evidence of unstable/closed WhatsApp session state.
- No current proof of recipient delivery exists.
- n8n is inbound-only and cannot be used as outbound evidence.
- AgentFlow can mark/store `sent` from Evolution acceptance/PENDING, which is weaker than actual WhatsApp delivery.
- UI wording overstates delivery confirmation.

Inbound is operational. Draft generation and human approval are operational. The missing production gate is reliable outbound transport plus delivery-state correctness.

## Recommended next action

Do not modify production workflows yet.

First fix the Evolution instance health and run a controlled transport smoke test. Once Evolution can send reliably, implement the state/UI hardening so AgentFlow distinguishes `submitted` from `delivered`. This will make the demo honest and repeatable instead of relying on a misleading `SENT` state.
