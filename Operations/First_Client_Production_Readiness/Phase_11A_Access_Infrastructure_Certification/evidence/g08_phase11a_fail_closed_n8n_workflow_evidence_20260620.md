# G08 Evidence — Phase 11A Fail-Closed n8n Workflow Update

**Timestamp:** 2026-06-20T00:57:09Z
**Workflow:** `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion`
**Workflow ID:** `8QAshjrkLrNF5kDI`
**Active:** yes
**Active version after update:** `0071e824-efe3-4651-a007-16f78f202517`

## Change Summary

Updated active n8n workflow to remove missing-instance fallback to `AgentFlow_Primary` and hand routing decisions to the database fail-closed RPC.

### Node: `Normalize Evolution Payload`

Before:

- Extracted Evolution instance from payload fields.
- Fell back to `'AgentFlow_Primary'` if missing.
- Built SQL for `public.ingest_inbound_message(...)` using a channel lookup.

After:

- Extracts Evolution instance only from payload/header fields.
- No fallback value is supplied.
- Missing instance identity is passed as `null` to the database fail-closed RPC.
- Builds SQL for `public.ingest_evolution_inbound_message(...)`.
- Emits operational booleans only in sanitized metadata; private payload and message body are not written to the rejection log.

### Node: `Call Fail-Closed Evolution Ingestion RPC`

Renamed from `Call Canonical Ingestion RPC`.

Continues to execute `={{ $json.sql }}`, now generated against:

```sql
public.ingest_evolution_inbound_message(...)
```

## n8n Validation Result

`n8n_validate_workflow` result:

- Valid: `true`
- Total nodes: `3`
- Enabled nodes: `3`
- Trigger nodes: `1`
- Valid connections: `2`
- Invalid connections: `0`
- Expressions validated: `1`
- Error count: `0`
- Warning count: `4`

Warnings:

- Webhook should always send a response even on error.
- Code node can throw errors; consider error handling.
- Webhook node has no explicit error handling branch.
- Postgres node has no retry/error handling branch.

These remain future hardening work. They do not reintroduce the `AgentFlow_Primary` fallback; database routing now fails closed before mutation.

## Safety Notes

No n8n webhook execution test was run because that could create persistent rejection evidence outside a rollback transaction. Functional behavior was validated at the database layer with rollback-only SQL.

No QR pairing, WhatsApp send, Evolution instance creation, outbound enablement, or Phase 11B execution was performed.
