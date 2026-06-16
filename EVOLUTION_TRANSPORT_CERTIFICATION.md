# EVOLUTION_TRANSPORT_CERTIFICATION.md

## Certification phase

Requested: Tue 2026-06-09 12:13 UTC
Scope: read-only Evolution outbound transport audit.
Production changes made: **none**.

## Executive conclusion

Governed outbound transport is **not certifiable yet**.

The outbound request reaches Evolution, but Evolution fails before WhatsApp transmission while trying to validate the recipient via Baileys `onWhatsApp`.

Current primary failure:

```text
POST /message/sendText/AgentFlow_Primary
  -> SendMessageController.sendText()
  -> WhatsAppBaileysService.textMessage()
  -> sendMessageWithTyping()
  -> whatsappNumber()
  -> this.client.onWhatsApp(...)
  -> TypeError: Cannot read properties of undefined (reading 'onWhatsApp')
```

This means the Evolution instance object exists, but its live Baileys socket/client is not usable. The instance reports `state=close`, and recent logs show connection/logout/session instability.

## Root cause

### Operational root cause

`AgentFlow_Primary` is not in a healthy, open WhatsApp/Baileys session. Evolution's instance record exists, but the live Baileys client/socket required for outbound recipient validation is missing/unusable.

Evidence:

```text
GET /instance/fetchInstances
AgentFlow_Primary status: close

GET /instance/connectionState/AgentFlow_Primary
state: close
```

Latest real outbound DB record:

```text
message_id: e2865de4-01cf-48e7-b47f-de9b920bbdc2
status: failed
last_error: evolution_send_failed_500
external_message_id: null
sent_at: null
Evolution response: Cannot read properties of undefined (reading 'onWhatsApp')
```

### Exact failing Evolution component

File inside the running Evolution container:

```text
/evolution/src/api/services/channels/whatsapp.baileys.service.ts
```

Failing method:

```ts
public async whatsappNumber(data: WhatsAppNumberDto) {
  ...
  const numbersToVerify = jids.users.map(({ jid }) => jid.replace('+', ''));
  const verify = await this.client.onWhatsApp(...numbersToVerify);
  ...
}
```

Source evidence:

- `sendMessage.router.ts:42-54` routes `/message/sendText/{instanceName}` to `sendMessageController.sendText(...)`.
- `sendMessage.controller.ts:27-30` calls `this.waMonitor.waInstances[instanceName].textMessage(data)`.
- `whatsapp.baileys.service.ts:1764-1774` calls `this.whatsappNumber({ numbers: [number] })` before sending.
- `whatsapp.baileys.service.ts:2673-2674` calls `this.client.onWhatsApp(...numbersToVerify)`.

The thrown error specifically means `this.client` is undefined at the point where Evolution expects a live Baileys socket.

### Evolution error-handling/build defect

Evolution v1.8.6 does not guard this path when the instance is closed or its client is unavailable. Instead of returning a clean `instance not connected` / `session closed` error, it dereferences `this.client.onWhatsApp` and returns HTTP 500.

So:

- The **session state** is the operational blocker.
- The **Evolution build/code path** is defective in how it reports the closed-client condition.

## Evidence collected

### 1. Evolution version and container state

Docker/runtime evidence:

```text
Container: evolution_api
Image tag: atendai/evolution-api:v1.8.7
API/package reported version: 1.8.6
Status: running
Healthcheck: none
Port bind: 127.0.0.1:8080->8080/tcp
```

API root:

```json
{
  "status": 200,
  "message": "Welcome to the Evolution API, it is working!",
  "version": "1.8.6"
}
```

Important note: the Docker image tag says `v1.8.7`, but the running app/package reports `1.8.6`. Treat the active behavior as Evolution API **v1.8.6**.

### 2. Instance health

```json
GET /instance/fetchInstances
[
  {
    "instance": {
      "instanceName": "AgentFlow_Primary",
      "status": "close",
      "integration": {
        "integration": "WHATSAPP-BAILEYS"
      }
    }
  }
]
```

```json
GET /instance/connectionState/AgentFlow_Primary
{
  "instance": {
    "instanceName": "AgentFlow_Primary",
    "state": "close"
  }
}
```

Determination: **session is not healthy**.

### 3. WhatsApp session artifacts

Session files exist under `/evolution/instances/AgentFlow_Primary`:

```text
creds.json
integration.json
app-state-sync-key-*.json
app-state-sync-version-*.json
pre-key-*.json
session-*.json
```

Count observed:

```text
38 files under /evolution/instances/AgentFlow_Primary
```

This confirms the instance is not missing from disk. The problem is not "no instance exists". The problem is that the persisted session is not currently connected as a live Baileys client.

### 4. Recipient formatting / onWhatsApp behavior

A read-only probe hit `/chat/whatsappNumbers/AgentFlow_Primary` using the latest outbound recipient in three formats:

```text
raw DB value         -> HTTP 500, onWhatsApp undefined
+digits              -> HTTP 500, onWhatsApp undefined
explicit WA JID      -> HTTP 500, onWhatsApp undefined
```

Shapes tested:

```text
raw_db_value: len=11, starts_plus=false, has_jid=false
plus_digits: len=12, starts_plus=true, has_jid=false
explicit_whatsapp_jid: len=26, starts_plus=false, has_jid=true
```

All produced the same error:

```json
{
  "status": 500,
  "error": "Internal Server Error",
  "response": {
    "message": "Cannot read properties of undefined (reading 'onWhatsApp')"
  }
}
```

Determination: **recipient formatting is not the root cause**. The failure happens before real recipient validity can be evaluated.

### 5. Container logs / session health indicators

Recent log counts sampled from the Evolution container show session instability:

```text
Connection closed:              10
Reconnecting to whatsapp:        8
Do not reconnect to whatsapp:    1
Connection opened:               1
creds.update:                  186
logout.instance:                 3
LOGOUT:                          5
PreKeyError:                     1
SessionError:                    2
Invalid buffer:                  7
groups is not iterable:         84
Stream Errored:                  2
Connection Failure:              1
Connection Terminated:           7
```

Representative log samples:

```text
Connection closed
Reconnecting to whatsapp
Connection Failure
Do not reconnect to whatsapp
Emittin event logout.instance
logout instance: AgentFlow_Primary
Instance "AgentFlow_Primary" - LOGOUT
Stream Errored (restart required)
PreKeyError: Invalid PreKey ID
SessionError: No session record
```

Determination: **session is unstable and has entered logged-out/closed client states**.

### 6. Transport dependencies

Runtime dependency shape:

```text
DATABASE_ENABLED=false
CACHE_REDIS_ENABLED=false
CACHE_LOCAL_ENABLED=true
STORE_CHATS=true
STORE_CONTACTS=true
STORE_MESSAGES=true
STORE_MESSAGE_UP=true
WEBSOCKET_ENABLED=false
RABBITMQ_ENABLED=false
WEBHOOK_GLOBAL_ENABLED=false
```

Mounted durable volumes:

```text
n8n_evolution_instances -> /evolution/instances
n8n_evolution_store     -> /evolution/store
```

Findings:

- Evolution is using local volume-backed state, not Postgres-backed Evolution state.
- Redis/RabbitMQ/WebSocket are disabled and not required for the current direct outbound path.
- n8n is not used for outbound dispatch in current AgentFlow approval flow.
- The immediate blocker is not a missing dependency service; it is the disconnected/unusable Baileys client for the instance.

## Required determinations

### Is session healthy?

**No.**

`AgentFlow_Primary` reports `state=close`. Logs show disconnect/reconnect/logout/session errors. The live Baileys client is unavailable in the validation/send path.

### Is recipient formatting causing failure?

**No.**

Raw digits, plus-prefixed digits, and explicit `@s.whatsapp.net` JID all fail with the same `this.client.onWhatsApp` undefined error.

### Is Evolution build defective?

**Partially, yes.**

The root operational condition is a closed/unhealthy session. However, Evolution v1.8.6 has a defective error path: `whatsappNumber()` does not check that `this.client` exists before calling `this.client.onWhatsApp(...)`. This turns a closed-instance condition into a generic HTTP 500.

### Is reconnect required?

**Yes.**

A controlled reconnect/re-authentication of `AgentFlow_Primary` is required before outbound can be certified.

### Is instance rebuild required?

**Not as first action.**

Lowest-risk path is reconnect/re-auth first. Rebuild should be used only if reconnect does not restore `state=open` and a successful `/chat/whatsappNumbers` result.

Given the logout/pre-key/session errors, a rebuild may become necessary if the existing Baileys auth material is stale or corrupted. But deleting/rebuilding the instance is more invasive and should follow a backup + reconnect attempt.

## Lowest-risk fix

Do not change AgentFlow production workflows yet.

Recommended sequence:

1. **Snapshot first**
   - Back up `/evolution/instances/AgentFlow_Primary`.
   - Back up `/evolution/store` or at least `auth`, `settings`, `webhook`, and `messages` paths.

2. **Controlled reconnect / re-auth**
   - Use Evolution's existing instance connect flow for `AgentFlow_Primary`.
   - If QR/pairing is returned, scan it with the intended WhatsApp device.
   - Wait until:

   ```text
   GET /instance/connectionState/AgentFlow_Primary -> state=open
   ```

3. **Read-only validation gate**
   - Run `/chat/whatsappNumbers/AgentFlow_Primary` against the controlled test recipient.
   - Expected healthy result: HTTP 200 with `exists`/`jid`, not HTTP 500.

4. **Outbound smoke test**
   - Send one governed outbound message to a known consenting test number.
   - Confirm receiving handset actually receives it.
   - Capture Evolution response, AgentFlow DB transition, and recipient confirmation.

5. **Only if reconnect fails**
   - Rebuild the Evolution instance from a backed-up state:
     - preserve webhook/API routing config
     - delete/recreate or logout/recreate `AgentFlow_Primary`
     - scan QR
     - re-verify `state=open`
     - re-run validation and outbound smoke test

## Estimated implementation time

### Reconnect path

```text
30-60 minutes
```

Includes backup, connect/QR scan, health verification, and one controlled outbound certification send.

### Instance rebuild path

```text
1-2.5 hours
```

Includes backup, delete/recreate/re-auth, restoring webhook/settings if needed, health checks, and certification send.

### App hardening follow-up

```text
0.5-1 engineering day
```

Recommended after transport restoration:

- Add pre-send Evolution health gate in AgentFlow.
- If instance state is not `open`, fail before preparing/finalizing outbound.
- Rename UI state from `sent/delivered` to `submitted` unless delivery receipt is received.
- Add receipt ingestion for true WhatsApp delivery status.

## Production readiness impact

Current outbound status: **NOT PRODUCTION READY**.

Impact:

- Inbound can still appear to work, but outbound certification fails because the Baileys client is not available for recipient validation/sending.
- Evolution returns a raw HTTP 500 instead of a clean closed-session error.
- AgentFlow should not be demonstrated as production outbound-ready until:
  - `AgentFlow_Primary` is `state=open`,
  - `/chat/whatsappNumbers` returns HTTP 200,
  - `/message/sendText` returns a valid external message id,
  - the receiving device confirms receipt,
  - DB/UI state semantics distinguish submitted vs delivered.

## Certification verdict

```text
EVOLUTION TRANSPORT CERTIFICATION: FAILED
Reason: AgentFlow_Primary Baileys session is closed/unhealthy; Evolution dereferences missing client in onWhatsApp validation path.
Next gate: reconnect/re-auth instance, then rerun recipient validation and controlled outbound smoke test.
```
