# Phase 11A — Evolution API + n8n/Webhook Safe Precheck

**Timestamp:** 2026-06-19 UTC
**Mode:** Safe downstream precheck while G03 remains `WAITING ON KOPANO`
**Scope guard:** No Kopano session used, no WhatsApp pairing, no outbound behavior enabled, no Phase 11B test messages sent.

## 1. Executive Status

| Area | Precheck Status | Certification Status | Notes |
|---|---:|---:|---|
| Evolution local container | PRECHECK PASS | REVALIDATION REQUIRED | Container is running and responds locally on `127.0.0.1:8080`. |
| Public Evolution route | BLOCKED | NOT PASSED | `https://agentflow.duckdns.org/evolution/...` returned `503 no available server`. |
| Libertalia-named Evolution instance | NOT FOUND | NOT PASSED | Current credential points to `AgentFlow_Primary`; fetch via public route failed, and no `libertalia` instance was discovered. |
| QR generation readiness | BLOCKED | NOT PASSED | QR readiness cannot be confirmed because public Evolution API route is 503. No QR contents were exposed and no pairing was attempted. |
| n8n active inbound workflow | PRECHECK PASS WITH WARNINGS | REVALIDATION REQUIRED | `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion` is active and validates, but live-event proof depends on Evolution route + pairing. |
| Webhook/auth posture | NEEDS HARDENING | REVALIDATION REQUIRED | Active n8n webhook path is unauthenticated at the n8n layer; protection currently depends on Evolution-side webhook configuration, which could not be read due 503. |
| Inbound DB mapping path | PRECHECK PASS WITH BLOCKER | REVALIDATION REQUIRED | Canonical RPC path exists, but no active Libertalia Evolution channel row exists yet. |
| Observability/retries | PARTIAL | REVALIDATION REQUIRED | n8n saves errors, suppresses success payloads, but lacks explicit node retry/error routes. |

## 2. Evolution API Evidence

Evidence files:

- `evidence/g06_evolution_precheck.json`
- `evidence/g06_evolution_local_health.txt`
- `evidence/g06_evolution_nginx_readonly.txt`

### Findings

1. Public configured Evolution route returned `503 no available server` for:
   - `/`
   - `/instance/fetchInstances`
   - `/instance/connectionState/AgentFlow_Primary`
   - `/webhook/find/AgentFlow_Primary`
   - `/settings/find/AgentFlow_Primary`
   - `/instance/connect/AgentFlow_Primary`
2. Local service health passed:
   - Docker container `evolution_api` is running.
   - Port binding is local-only: `127.0.0.1:8080->8080/tcp`.
   - Local request to `http://127.0.0.1:8080/` returned `200` with Evolution API welcome JSON.
3. Nginx/public edge check:
   - `nginx` service is active.
   - The shell did not expose `nginx -t`.
   - Standard `/etc/nginx/sites-*` grep did not reveal readable/matching Evolution proxy refs in this run.

### G06 Gate Result

**G06 remains `REVALIDATION REQUIRED / BLOCKED`, not passed.**

Required before G06 can pass:

1. Fix or verify the public Evolution `/evolution/` proxy path so it reaches local `127.0.0.1:8080`.
2. Confirm the target client instance naming strategy:
   - either create/verify a dedicated Libertalia instance, or
   - explicitly document use of `AgentFlow_Primary` for Libertalia pilot.
3. Read Evolution instance status and webhook configuration without exposing secrets.
4. Confirm QR endpoint returns a QR payload only when founder is ready to pair.
5. Pair only after founder authorization and scan.

## 3. n8n Workflow Evidence

Evidence files:

- `evidence/g08_g10_supabase_ingestion_schema_precheck.txt`
- `evidence/g08_ingest_rpc_summary.txt`
- `evidence/g08_intake_rpc_summary.txt`
- `evidence/g08_g10_observability_retry_error_precheck.txt`
- `evidence/g10_outbound_surface_source_check.txt`

Active workflow inspected:

| Field | Value |
|---|---|
| Workflow name | `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion` |
| Workflow id | `8QAshjrkLrNF5kDI` |
| Active | `true` |
| Trigger path | `agentflow-stage-c-inbound` |
| Nodes | Webhook → Normalize Evolution Payload → Postgres RPC |
| Success execution retention | `none` |
| Error execution retention | `all` |

Validation result:

- n8n workflow validation: `valid=true`
- Error count: `0`
- Warning count: `5`

Warnings requiring hardening:

1. Webhook node should always send a response even on error.
2. Webhook node lacks explicit error handling.
3. Code node can throw errors and has no explicit error route.
4. Postgres node lacks retry/error output configuration.
5. Validation recommends adding an Error Trigger or error outputs.

## 4. Inbound Mapping / Threading / Dedupe / Tenant Attribution

### n8n Mapping Path

The active workflow normalizes Evolution payloads and calls:

```sql
public.ingest_inbound_message(...)
```

It maps:

- `instance` → channel lookup by `provider='evolution'` and `external_channel_id=instance`
- `remoteJid` / sender fields → external conversation and sender identity
- message id / timestamp / text → canonical message fields
- source metadata → `exact_source='whatsapp'`, `source_subtype='evolution'`, `original_inbound_channel=instance`

### Database Readiness

Confirmed structures:

- `channels`
- `conversations`
- `messages`
- `leads`
- `automation_events`
- `ingress_replay_keys`
- `audit_logs`
- `lead_events`

Confirmed indexes include:

- `channels_provider_external_global_unique_idx`
- `conversations_org_channel_external_unique_idx`
- `messages_org_channel_external_unique_idx`
- lead normalized email/phone unique indexes
- automation event status/type indexes

Confirmed active channel rows:

| Provider | External Channel | Status | Org |
|---|---|---:|---|
| evolution | `AgentFlow_Primary` | active | `gen-i-demo-realty` |
| evolution | `stage-e-demo-channel` | active | `gen-i-demo-realty` |
| property24 | `property24` | active | `gen-i-demo-realty` |
| evolution | `stage-e-rival-channel` | active | `rival-demo-realty` |

### Blocker

No active `libertalia-properties` Evolution channel row exists in the inspected database state. If Evolution sends `instance=AgentFlow_Primary`, the current channel lookup points to `gen-i-demo-realty`, not Libertalia.

**This is a tenant-attribution blocker.**

Required before live inbound can pass:

1. Add/verify a Libertalia-specific active Evolution channel row after the instance decision is made.
2. Ensure the Evolution webhook payload instance name maps to Libertalia, not demo.
3. Re-run a non-destructive mapping check before any live Phase 11B message.

## 5. Outbound Safety

Source inspection confirms outbound send behavior is guarded by `OUTBOUND_TRANSPORT_ENABLED === "true"` and a governed execution secret path. No environment values were printed or changed.

No outbound automation was enabled during this precheck.

## 6. Verdict

**Safe precheck completed, but G06/G08/G10 cannot pass yet.**

Primary blockers:

1. Public Evolution `/evolution/` route returns 503.
2. No confirmed Libertalia Evolution instance/channel mapping.
3. n8n inbound workflow lacks explicit retry/error branches.
4. Live webhook behavior cannot be proven until Evolution route and pairing are restored.

Recommended next technical action after founder approval: repair/verify Evolution public proxy path, then configure/verify a Libertalia-specific instance/channel mapping before QR pairing.
