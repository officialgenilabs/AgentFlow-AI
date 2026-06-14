# OUTBOUND_RECOVERY_REPORT.md

## AgentFlow outbound WhatsApp recovery report

**Date:** 2026-06-10
**Scope:** Restore/certify existing governed approval → Evolution → WhatsApp transport path.
**Architecture changes:** None.
**New systems introduced:** None.
**Canonical root-cause input:** `OUTBOUND_TRANSPORT_ROOT_CAUSE.md`.

## Executive status

**Recovered to transport-accepted state.**

The previous failure point was an unhealthy/closed Evolution Baileys session for `AgentFlow_Primary`. After controlled Evolution reconnect/restart checks, the instance returned to `open`, recipient registration checks succeeded, and the previously failed governed outbound message was retried through the existing approval/RPC/Evolution path.

AgentFlow finalized the message as `sent` after Evolution returned HTTP `201` with a WhatsApp external message id.

**Important limitation:** Evolution returned immediate send status `PENDING`. That proves Evolution accepted the WhatsApp send request and produced a message id, but it is not handset-delivery proof. Final recipient confirmation is still required for full Definition-of-Success closure.

## Required path traced

Current implemented path is the existing governed server-side path:

1. Approval UI submit: `src/features/approvals/approval-queue-client.tsx`
2. Server action/API boundary: `src/features/approvals/actions.ts::reviewAiMessageDraft(...)`
3. Draft review RPC: `public.review_ai_message_draft(...)`
4. Governed send queue/state: `public.send_outbound_message(..., p_action='prepare')`
   - creates/updates an outbound `public.messages` row with `status='pending'`
   - enforces approved draft, org access, active channel, recipient phone, duplicate-send protection, and execution secret
5. Evolution transport client: `src/lib/evolution.ts::sendEvolutionTextMessage(...)`
6. Evolution API: `POST /message/sendText/AgentFlow_Primary`
7. WhatsApp/Baileys provider path inside Evolution
8. Governed finalize: `public.send_outbound_message(..., p_action='finalize')`
   - writes final message status, external message id, audit log, and automation event

## Exact failure point identified

Previous failing path:

```text
POST /message/sendText/AgentFlow_Primary
→ SendMessageController.sendText()
→ WhatsAppBaileysService.textMessage()
→ sendMessageWithTyping()
→ whatsappNumber()
→ this.client.onWhatsApp(...)
→ TypeError: Cannot read properties of undefined (reading 'onWhatsApp')
```

Root cause:

- Evolution API was running.
- `AgentFlow_Primary` instance metadata existed.
- The live Baileys client/session was not healthy/open.
- Evolution exposed this as HTTP 500 during recipient validation instead of returning a clean “instance closed” error.

## Verification results

### Evolution instance health

- Container: `evolution_api`
- Image tag observed: `atendai/evolution-api:v1.8.7`
- API reported version: `1.8.6`
- Local bind: `127.0.0.1:8080`
- Public route remains nginx-managed; no direct public port opened.

Result: **healthy API process**.

### Instance state

`GET /instance/connectionState/AgentFlow_Primary` after recovery:

```json
{ "state": "open" }
```

Result: **open**.

### Provider/session state

`GET /instance/fetchInstances?instanceName=AgentFlow_Primary` after recovery showed:

- `instanceName`: `AgentFlow_Primary`
- `status`: `open`
- `owner`: present
- `profileName`: present
- `serverUrl`: configured

Result: **Evolution/Baileys session active**.

### Number registration

`POST /chat/whatsappNumbers/AgentFlow_Primary` for the outbound recipient ending `5990`:

```json
{
  "http_status": 200,
  "exists": true,
  "jid_present": true
}
```

Result: **registered WhatsApp recipient**.

### Outbound permissions/governance

Governed retry used existing approved failed draft:

- Draft id: `2a123e14-3123-4b9c-bdff-38a7c99897c6`
- Existing outbound message id: `e2865de4-01cf-48e7-b47f-de9b920bbdc2`
- Previous status: `failed`
- Previous error: `evolution_send_failed_500`
- Previous delivery attempts: `2`

Prepare result:

```json
{
  "message_id": "e2865de4-01cf-48e7-b47f-de9b920bbdc2",
  "status": "pending",
  "can_send": true,
  "recipient_last4": "5990",
  "evolution_instance": "AgentFlow_Primary"
}
```

Result: **governed outbound permission granted by existing RPC**.

## Controlled repair executed

No AgentFlow code or architecture was changed.

Actions performed:

1. Confirmed Evolution API health.
2. Confirmed `AgentFlow_Primary` was previously `close`.
3. Used existing Evolution instance lifecycle endpoints/checks to reconnect/restart the instance.
4. Preserved existing webhook/settings/auth/session artifacts.
5. Rechecked instance until it returned `open`.
6. Re-ran recipient registration check via Evolution.
7. Retried the existing approved failed outbound draft through the governed send path.

## Certification

### Test A — inbound message

Evidence tied to the recovered outbound draft:

- Inbound source message id: `99e36b5f-8094-4aec-ac2d-02ee0fb42422`
- Direction: `inbound`
- Sender type: `lead`
- Channel type: `whatsapp`
- Provider: `evolution`
- Channel external id: `AgentFlow_Primary`
- Lead: `MissG`
- Draft created from inbound message: `2a123e14-3123-4b9c-bdff-38a7c99897c6`
- Draft status before retry: `approved`

Result: **PASS** — existing inbound WhatsApp → AgentFlow draft chain verified.

### Test B — Approve & Send / governed outbound execution

The already-approved failed draft was retried through the same governed approval execution path:

1. `send_outbound_message(..., 'prepare')`
2. Evolution recipient check
3. `POST /message/sendText/AgentFlow_Primary`
4. `send_outbound_message(..., 'finalize')`

Evolution send result:

```json
{
  "http_status": 201,
  "external_message_id_present": true,
  "evolution_status": "PENDING"
}
```

AgentFlow final DB state:

```json
{
  "message_id": "e2865de4-01cf-48e7-b47f-de9b920bbdc2",
  "status": "sent",
  "external_message_id_present": true,
  "sent_at": "2026-06-10T17:30:31.491112+00:00",
  "delivery_status": "sent",
  "delivery_attempts": 3,
  "last_error": null,
  "evolution_http_status": 201,
  "evolution_response_status": "PENDING"
}
```

Automation event evidence:

```json
{
  "event_type": "message.sent",
  "status": "processed",
  "processed_at": "2026-06-10T17:30:31.491112+00:00",
  "external_message_id_present": true
}
```

Result: **PASS** — governed outbound path executed and finalized successfully.

### Test C — recipient confirms delivery

Current state:

- Evolution accepted the send.
- WhatsApp external message id exists.
- Evolution immediate status was `PENDING`.
- No recipient-side confirmation was available from this terminal session at report time.

Result: **PENDING HUMAN CONFIRMATION**.

Required closure step:

- Recipient/phone ending `5990` must confirm the message arrived, or Evolution must emit a delivery/read ACK for the new external message id.

## Final determination

The original technical failure is repaired:

```text
closed/unusable Evolution Baileys client
→ AgentFlow_Primary open
→ recipient registration passes
→ governed retry accepted by Evolution
→ AgentFlow finalized as sent
```

Full business Definition of Success is **not yet fully closed** until Test C is confirmed on the recipient handset.

## No-change assurance

- No canonical architecture changes.
- No new queue/system/transport built.
- No code changes required for recovery.
- Existing governed approval/RPC/Evolution path was used.
- Existing failed approved draft was retried instead of creating a new production outbound message.

## Follow-up recommendations

1. Ask recipient ending `5990` to confirm receipt of the WhatsApp message.
2. Add/validate delivery ACK handling later so AgentFlow does not equate Evolution `PENDING` with final handset delivery.
3. Keep `AgentFlow_Primary` session health monitored; alert if `connectionState` leaves `open`.
4. Consider a future controlled Evolution upgrade/patch only after the current production recovery is accepted; v1.8.6/v1.8.7 behavior dereferences `this.client.onWhatsApp` when the instance is closed.
