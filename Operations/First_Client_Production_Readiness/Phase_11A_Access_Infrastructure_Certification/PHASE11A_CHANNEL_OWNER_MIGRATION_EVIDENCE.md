# Phase 11A — Channel Owner Migration Evidence

**Timestamp:** 2026-06-20T00:57:09Z
**Migration:** `supabase/migrations/20260620_phase11a_channel_owner_fail_closed_routing.sql`
**Validation mode:** dry-run transaction, applied migration, idempotent hardening reapply, rollback-only functional validation.

## 1. Migration Dry Run

Command executed through the local Node/pg runner using stored Supabase staging DB credentials without printing secrets.

Result:

```json
{
  "dryRun": "passed",
  "checks": {
    "rejection_table_exists": true,
    "owner_column_exists": true,
    "wrapper_exists": true
  }
}
```

## 2. Migration Apply

Result:

```json
{
  "apply": "committed",
  "checks": {
    "rejection_table_exists": true,
    "owner_column_exists": true,
    "default_assignee_column_exists": true,
    "wrapper_exists": true
  }
}
```

## 3. Hardening Reapply

After the first apply, the `AgentFlow_Primary` lock was tightened to be case-insensitive and the idempotent migration was reapplied.

Result:

```json
{
  "reapply": "committed",
  "hardening": "case-insensitive AgentFlow_Primary lock"
}
```

## 4. Schema Artifacts Added / Updated

### `public.channels`

Added columns:

- `owner_user_id uuid`
- `default_assignee_user_id uuid`
- `visibility_scope text not null default 'agency_shared'`
- `fail_closed_policy text not null default 'quarantine'`
- `created_by_user_id uuid`
- `updated_by_user_id uuid`

Constraints / guards:

- `visibility_scope in ('agent_owned', 'agency_shared')`
- `fail_closed_policy in ('reject', 'quarantine')`
- owner/default assignee must belong to the same organization.
- active Evolution channels require `external_channel_id`.
- active agent-owned Evolution channels require `default_assignee_user_id`.
- `AgentFlow_Primary` is blocked for non-internal channel context unless `metadata.routing_scope='gen_i_labs_internal'`.

### `public.inbound_routing_rejections`

Created sanitized evidence table with RLS enabled.

Stores:

- `organization_id` / `channel_id` when safely resolvable.
- source/provider.
- redacted and hashed external channel id.
- rejection/quarantine reason and policy.
- tenant/owner resolution status.
- safe workflow id.
- remediation hint.
- sanitized JSON metadata.
- payload fingerprint.
- status/review fields.

Does not store raw WhatsApp payloads, message bodies, QR contents, API keys, tokens, webhook secrets, or raw phone numbers.

### RPCs / functions

Added or replaced:

- `app_private.redact_identifier(text)`
- `app_private.sha256_text(text)`
- `app_private.log_inbound_routing_rejection(...)`
- `public.ingest_evolution_inbound_message(...)`
- `public.ingest_inbound_message(...)`
- `public.send_outbound_message(...)`

## 5. Functional Validation

Rollback-only validation script:

- `supabase/tests/phase11a_fail_closed_routing_validation.sql`

Result:

```json
{
  "validation": "passed",
  "rollbackOnly": true,
  "cases": [
    "known_mapped",
    "unknown",
    "disabled",
    "missing_owner",
    "ambiguous_case_variant",
    "inactive_owner",
    "agentflow_primary_case_insensitive_lock",
    "malformed",
    "duplicate_dedupe"
  ]
}
```

The validation creates temporary rollback-only synthetic channels/messages and rolls them back. It does not create or seed `Libertalia_Kopano_Primary` and does not persist test client data.

## 6. Safety Confirmation

- No destructive migration executed.
- No raw secrets printed.
- No QR contents exposed.
- No Evolution instance created.
- No WhatsApp message sent.
- No Phase 11B execution.
