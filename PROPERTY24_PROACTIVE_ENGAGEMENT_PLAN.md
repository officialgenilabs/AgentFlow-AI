# Property24 Proactive Engagement Plan

**Status:** Architecture analysis only — no implementation in this pass.
**Target behavior:** Property24 lead enters AgentFlow → lead is created/matched → conversation is created → AI sends exactly one initial qualification message automatically → all later AI responses remain governed through the existing draft approval flow.

---

## 1. Executive Verdict

AgentFlow already has most of the foundation for this flow:

- Signed Property24 ingress exists.
- Property24 intake can create or match a lead.
- Property24 intake can create/attach a conversation and inbound message.
- Automation events are emitted for downstream processing.
- Governed draft review and outbound message certification exist.
- Evolution WhatsApp transport exists behind server-side credentials and safety checks.

The missing piece is **not a small switch**. The current architecture does **not** yet have a safe, active, tenant-scoped automation that auto-generates and auto-sends the first Property24 qualification message while preserving the human approval gate for future messages.

Recommended path: add a **new event-driven first-touch automation path** behind tenant-specific flags. It should create a normal `ai_message_drafts` record, auto-approve only under a narrow server-side policy, send through the same governed outbound/audit infrastructure, and then permanently mark the lead/conversation as having received the one allowed proactive first touch.

Do **not** reactivate old quarantined n8n workflows for this. They contain useful prompt/process history, but they predate the current governed outbound model and include direct proactive WhatsApp sends.

---

## 2. Current Architecture Support

### 2.1 Property24 signed ingress

`src/app/api/ingress/property24/route.ts` provides a server route for Property24 JSON ingress.

Current behavior:

1. Requires `PROPERTY24_INGRESS_SECRET`.
2. Verifies `x-agentflow-timestamp` and `x-agentflow-signature` with HMAC SHA-256.
3. Resolves tenant from `x-agentflow-org-slug`, payload org slug, env default, or demo fallback.
4. Normalizes Property24 contact/listing/message fields.
5. Calls `public.ingest_property24_lead(...)`.
6. Returns the RPC result; duplicate replay keys return `409`.

Evidence:

- Signature validation: `src/app/api/ingress/property24/route.ts:33-53`
- Tenant/payload normalization: `src/app/api/ingress/property24/route.ts:65-107`
- RPC call: `src/app/api/ingress/property24/route.ts:127-142`

### 2.2 Property24 database ingestion

`supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql` implements the canonical Property24 ingest function.

Current behavior:

1. Protects against replay via `public.ingress_replay_keys`.
2. Ensures a `property24` channel exists for the organization.
3. Matches an existing lead by identity or creates a new lead.
4. Creates/attaches a Property24 conversation.
5. Inserts the inbound message through the controlled ingestion context.
6. Emits `conversation.created` and/or `message.received` automation events.
7. Explicitly states that no outbound send is triggered by the migration.

Evidence:

- Migration comment says no outbound: `supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql:1-2`
- Replay key protection: `supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql:259-265`
- Property24 channel creation: `supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql:267-288`
- Lead create/match: `supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql:301-397`
- Conversation creation: `supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql:399-432`
- Inbound message insert: `supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql:458-495`
- Automation events: `supabase/migrations/20260524_phase10_property24_ingress_and_draft_review.sql:504-544`

### 2.3 Conversation/message integrity

Stage C correctly treats conversations/messages as governed infrastructure.

Current behavior:

- Channels, conversations, messages, and automation events exist as first-class tables.
- Direct message inserts are blocked unless the DB session has the correct ingestion/outbound context.
- Stage C initially made outbound and AI replies intentionally out of scope.
- Phase 10B later added controlled outbound insertion via `send_outbound_message`.

Evidence:

- Stage C doctrine: `supabase/migrations/20260430_stage_c_conversations_inbox.sql:1-9`
- Core schema: `supabase/migrations/20260430_stage_c_conversations_inbox.sql:15-115`
- Initial inbound-only message guard: `supabase/migrations/20260430_stage_c_conversations_inbox.sql:179-193`
- Phase 10B inbound/outbound guard: `supabase/migrations/20260525_phase10b_governed_outbound_certification.sql:156-185`
- Outbound messages require `draft_id`: `supabase/migrations/20260525_phase10b_governed_outbound_certification.sql:228-229`

### 2.4 Approval queue and governed outbound

The app has a governed approval flow backed by `ai_message_drafts`.

Current behavior:

- Approval queue reads draft records for the tenant.
- Human review can update, approve, or discard a draft.
- If `OUTBOUND_TRANSPORT_ENABLED=true`, approved drafts are sent through a server action.
- Sending uses `send_outbound_message` with a server-held execution secret.
- `send_outbound_message` prepares a pending outbound message, external transport sends it, and then the DB is finalized as `sent` or `failed`.

Evidence:

- Approval queue query: `src/lib/data/approvals.ts:95-139`
- Inbox reads drafts beside messages: `src/lib/data/inbox.ts:103-118`
- Human review and send action: `src/features/approvals/actions.ts:61-142`
- `send_outbound_message` requires approved draft: `supabase/migrations/20260525_phase10b_governed_outbound_certification.sql:340-341`
- Prepare creates pending outbound message: `supabase/migrations/20260525_phase10b_governed_outbound_certification.sql:394-510`
- Finalize writes `message.sent` / `message.failed`: `supabase/migrations/20260525_phase10b_governed_outbound_certification.sql:524-625`
- Evolution transport helper: `src/lib/evolution.ts`

### 2.5 n8n workflow state

Current active AgentFlow n8n support is narrow:

- `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion` is active and only handles Evolution inbound → canonical DB ingestion.
- Old AgentFlow candidate/portal workflows are inactive and tagged `phase-9c-quarantine`.
- The old quarantined workflows include direct AI/proactive WhatsApp concepts, but they are not active and should not be treated as production-ready for this requirement.

Observed active AgentFlow workflow:

- `AgentFlow_AI_STAGE_C_Evolution_Inbound_Ingestion` (`8QAshjrkLrNF5kDI`) — active, 3 nodes, inbound only.

Relevant inactive/quarantined workflows:

- `AgentFlow_AI_STAGE30_Production_Portal_Intake` (`KwMdo3kfaAUcOn6M`) — inactive; contains legacy portal intake and proactive WhatsApp nodes.
- `AgentFlow_AI_V2_Production_CANDIDATE_STAGE26` (`JI9DU2OVusn30mbx`) — inactive; contains older direct AI + Evolution outbound logic.

---

## 3. Requirement Fit

| Requirement | Current support | Notes |
| --- | --- | --- |
| Property24 lead enters AgentFlow | **Supported** | Signed route and `ingest_property24_lead` exist. |
| Lead is created/matched | **Supported** | Uses org-scoped identity matching or creates lead. |
| Conversation is created | **Supported** | Creates/attaches a Property24 `lead_portal` conversation. |
| Inbound message is persisted | **Supported** | Uses controlled ingestion context. |
| AI draft is generated | **Unclear / not fully versioned** | App reads `ai_message_drafts`, and migration comments assume an event pipeline, but no active app/n8n draft generator was found in inspected source/workflows. |
| First qualification message auto-sends | **Not supported safely yet** | Existing send path requires human-approved draft and authenticated actor. |
| Future messages governed through approval | **Supported conceptually** | Existing approval queue and `send_outbound_message` support governed send after draft review. |
| Tenant-specific enablement | **Partial** | Org slug routing exists; no first-touch per-tenant automation policy was found. |

---

## 4. Critical Gaps / Risks

### 4.1 No active first-touch automation

The current Property24 ingest path emits events but does not send outbound. This is correct for safety, but it means the requested proactive first qualification message needs a new orchestrator.

### 4.2 Draft generation path is not visible enough

The app expects `ai_message_drafts`, but the inspected repo does not contain a clear insert/generation path for those drafts. Before enabling proactive sends, the draft generator should be brought under version control and certified.

Required minimum:

- deterministic trigger source
- model/prompt version recorded
- generated content stored in `ai_message_drafts`
- generation context includes source message, listing metadata, identity confidence, and policy decision
- no direct transport call during draft generation

### 4.3 Property24 conversation is not automatically a WhatsApp transport conversation

`ingest_property24_lead` creates a channel with:

- `provider = 'property24'`
- `channel_type = 'lead_portal'`
- `external_channel_id = 'property24'`

`send_outbound_message` currently resolves the Evolution instance from the draft conversation channel:

1. `channel.metadata->>'evolution_instance'`
2. fallback `channel.external_channel_id`

For a Property24 conversation, that fallback would be `property24`, which is not an Evolution instance.

Implication: a proactive WhatsApp send should **not blindly send from the Property24 channel** unless the channel metadata is deliberately configured with the correct Evolution instance. The cleaner path is to create/resolve a WhatsApp/Evolution conversation for the same lead and send the first qualification message there, while linking it back to the Property24 source conversation/message in metadata.

### 4.4 Future WhatsApp replies may create a separate conversation

The active Evolution inbound n8n workflow uses Evolution sender identity/JID as the external conversation id. A lead who replies on WhatsApp may land in an Evolution-channel conversation, not the original Property24-channel conversation.

Safe design needs one of these choices:

1. **Recommended:** treat Property24 as source intake and WhatsApp as engagement thread. Create the first outbound in the WhatsApp conversation and link back to the Property24 source.
2. Simpler but less clean: store `evolution_instance` on the Property24 channel and send from the Property24 conversation, accepting that later WhatsApp inbound may split into an Evolution conversation.
3. Heavier: add a unified lead timeline view that groups conversations by lead while preserving channel-specific conversations.

### 4.5 Existing governed send requires human approval

`send_outbound_message` requires:

- authenticated actor
- org access
- draft status `approved`
- `approved_by_user_id`
- `approved_at`
- valid server-held execution secret

This is correct for the normal approval path. For the first automated message, we need a narrow **system-approved first-touch path** — not a broad bypass.

### 4.6 Global outbound flag is not enough

`OUTBOUND_TRANSPORT_ENABLED` is global. The requested behavior needs per-tenant, per-source enablement.

Example: enable for `libertalia-properties` Property24 first touch only, while leaving all other tenants/sources in manual approval mode.

---

## 5. Recommended Target Architecture

### 5.1 High-level flow

```text
Property24 signed payload
  → /api/ingress/property24
  → public.ingest_property24_lead(...)
  → lead created/matched
  → Property24 source conversation/message created
  → automation_events.message.received(source=property24)
  → First-touch worker evaluates tenant policy
  → resolve/create WhatsApp engagement conversation for same lead
  → generate first qualification draft
  → auto-approve only if policy allows first-touch automation
  → prepare outbound through governed DB path
  → send via Evolution
  → finalize sent/failed evidence
  → mark first-touch complete
  → all future messages produce normal drafts requiring human approval
```

### 5.2 Trigger source

Use `automation_events` as the trigger, not the webhook route.

Preferred trigger condition:

```text
event_type = 'message.received'
payload.source = 'property24'
status = 'pending'
```

Then query the DB for eligibility:

- organization active
- tenant policy enabled
- source message is inbound
- source lead exists
- source lead has sendable phone
- no prior successful `property24_first_touch` for this lead/conversation/source message
- no prior outbound message for the target WhatsApp engagement conversation, unless explicitly retrying a failed first-touch
- Evolution instance/channel certified for the tenant

### 5.3 Target conversation strategy

Recommended: create or resolve a **WhatsApp/Evolution engagement conversation** linked to the same lead.

The first proactive draft should use:

- `conversation_id` = WhatsApp/Evolution engagement conversation
- `message_id` = original Property24 inbound source message
- `lead_id` = matched/created lead
- `generation_context.source_conversation_id` = original Property24 conversation
- `generation_context.source_message_id` = original Property24 inbound message
- `generation_context.proactive_first_touch = true`
- `generation_context.requires_future_human_approval = true`

This preserves the source-of-truth intake message while ensuring the outbound transport uses a real Evolution channel.

Important certification detail: the WhatsApp conversation external id must match the active Evolution inbound normalizer format, otherwise the reply may create a duplicate conversation. Certify whether the canonical external id should be the full remote JID, normalized E.164 phone, or another stable identity.

### 5.4 First message content policy

The first qualification message should be constrained, short, and template-guided. It should not invent listing availability or pricing.

Recommended structure:

```text
Hi {{first_name}}, thanks for your Property24 enquiry about {{property_reference_or_title}}. Are you looking to arrange a viewing, or would you like me to send a few quick details first?
```

If the Property24 message already clearly asks for viewing:

```text
Hi {{first_name}}, happy to help arrange a viewing for {{property_reference_or_title}}. Which day/time suits you best, or should I send available slots?
```

Rules:

- one message only
- no booking link unless tenant policy explicitly allows it
- no property availability claims unless verified data exists
- no legal/finance promises
- no attachments/documents
- no bulk follow-up
- no seller-side automation in this phase

### 5.5 Future-message governance

After the first automated send:

- set a durable marker, e.g. `lead_origin_metadata.property24_first_touch.sent_at`, conversation metadata, and/or a dedicated table row
- mark the automation event processed
- any later `message.received` events generate drafts with `status='draft'`
- approval queue remains the only path to send subsequent AI replies
- `send_outbound_message` remains the controlled transport gate

Hard rule:

```text
Auto-send is allowed only when first_touch_sent_at is null and policy allows source=property24 capability=initial_qualification_autosend.
```

---

## 6. Required Workflow Changes

### 6.1 Database / policy layer

Add tenant-scoped automation policy.

Recommended shape:

```sql
create table public.organization_automation_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source text not null,
  capability text not null,
  enabled boolean not null default false,
  mode text not null default 'draft_only',
  automation_actor_user_id uuid references public.profiles(id) on delete restrict,
  transport_channel_id uuid references public.channels(id) on delete restrict,
  prompt_version text not null default 'property24_first_touch_v1',
  max_auto_sends_per_lead integer not null default 1,
  quiet_hours jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source, capability)
);
```

For this use case:

```text
source = property24
capability = initial_qualification_autosend
mode = draft_only | dry_run | autosend
```

Default must be disabled.

### 6.2 First-touch idempotency

Add durable idempotency for proactive first touch.

Options:

1. Dedicated table: `proactive_engagement_runs`
2. Unique index on `automation_events` payload fields is awkward; avoid.
3. Metadata-only marker is useful but not enough for concurrency safety.

Recommended table:

```sql
create table public.proactive_engagement_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  source text not null,
  source_message_id uuid not null references public.messages(id) on delete cascade,
  target_conversation_id uuid references public.conversations(id) on delete set null,
  draft_id uuid,
  outbound_message_id uuid,
  status text not null default 'pending',
  policy_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source, source_message_id),
  unique (organization_id, source, lead_id) where status in ('sent', 'pending', 'processing')
);
```

This prevents duplicate proactive sends from replayed events, retries, or concurrent workers.

### 6.3 Draft creation path

Add a server-side, versioned draft creation path.

Minimum fields:

- `organization_id`
- `conversation_id` = WhatsApp engagement conversation
- `message_id` = Property24 inbound source message
- `lead_id`
- `draft_content`
- `status = 'draft'` initially
- `generation_model`
- `generation_context`

`generation_context` should include:

```json
{
  "source": "property24",
  "capability": "initial_qualification_autosend",
  "source_conversation_id": "...",
  "source_message_id": "...",
  "target_transport": "evolution_whatsapp",
  "prompt_version": "property24_first_touch_v1",
  "policy_mode": "dry_run|autosend",
  "requires_future_human_approval": true,
  "routing_rationale": "Tenant enabled Property24 first-touch only; subsequent replies require approval."
}
```

### 6.4 Auto-approval path for first touch only

Do not weaken `review_ai_message_draft` globally.

Add a new server-only path that can mark a first-touch draft as approved only when:

- tenant policy is enabled
- source is Property24
- source message is inbound
- no previous first-touch run exists for the lead/source message
- draft generation context says `proactive_first_touch=true`
- automation actor is configured
- server execution secret is valid

Implementation options:

#### Option A — recommended: DB helper refactor

Refactor outbound DB logic into private helper functions:

- `app_private.prepare_outbound_message(actor_user_id, draft_id, execution_context)`
- `app_private.finalize_outbound_message(actor_user_id, draft_id, delivery_status, ...)`

Then expose:

- existing `public.send_outbound_message(...)` for human-approved sends using `auth.uid()`
- new `public.send_property24_first_touch(...)` for system-approved first-touch using `automation_actor_user_id` from policy plus server-held secret

This keeps all outbound messages using the same DB/audit path.

#### Option B — acceptable short-term: server action/API as automation actor

Create a Next.js server route/worker that signs in as a dedicated tenant automation user, calls existing review/send RPCs, sends via Evolution, and finalizes. This avoids DB refactor but introduces credential management risk and should be treated as less ideal.

### 6.5 Transport routing

Do not rely on the Property24 channel as the Evolution sender unless explicitly configured.

Preferred:

- Use or create an Evolution channel per tenant.
- Store the certified Evolution instance on that channel.
- Create/resolve the target WhatsApp conversation under that channel.
- Send outbound from that WhatsApp conversation.

Required config:

```text
transport_channel_id = <tenant Evolution channel id>
evolution_instance = Libertalia_Properties or certified tenant instance
```

### 6.6 Worker / n8n workflow

Add a new workflow; do not edit/revive quarantined workflows.

Suggested name:

```text
AgentFlow_Property24_First_Touch_Qualification
```

Responsibilities:

1. Poll or receive pending `automation_events.message.received` events.
2. Filter to `payload.source='property24'`.
3. Load tenant policy.
4. Acquire idempotency/run lock.
5. Resolve/create WhatsApp engagement conversation.
6. Generate qualification draft.
7. If mode is `draft_only` or `dry_run`, stop before send and log evidence.
8. If mode is `autosend`, auto-approve through the narrow first-touch policy path.
9. Prepare outbound message.
10. Call Evolution send.
11. Finalize sent/failed.
12. Mark run and event status.

A Next.js/queue worker can do the same job. n8n is acceptable if it uses the governed DB/API paths and never sends directly from a raw AI node.

---

## 7. Tenant-Specific Enablement

### 7.1 Default posture

Default for every tenant:

```text
Property24 first-touch autosend = disabled
Property24 draft generation = optional/draft-only
Future replies = approval required
```

### 7.2 Enablement requirements per tenant

A tenant can enter `autosend` mode only after these gates pass:

1. Tenant org exists and is active.
2. Property24 ingress uses a hard-coded/verified org slug.
3. Property24 ingress secret/digest is configured.
4. Sample Property24 payload parses into signed JSON.
5. Lead/conversation/message creation passes in staging.
6. Evolution instance is tenant-specific or explicitly certified for that tenant.
7. Recipient is not the instance owner.
8. Outbound smoke test reaches a consenting recipient.
9. Initial qualification prompt/template is approved for tenant tone and scope.
10. Kill switch is tested.

### 7.3 Libertalia example

Existing Libertalia docs already identify the likely tenant settings:

- org slug: `libertalia-properties`
- Property24 org routing header: `x-agentflow-org-slug: libertalia-properties`
- recommended Evolution instance: `Libertalia_Properties`
- Phase 1 safety: guided follow-up / manual send unless WhatsApp outbound is certified

Recommended initial policy:

```yaml
organization_slug: libertalia-properties
source: property24
capability: initial_qualification_autosend
enabled: true
mode: dry_run
transport: evolution_whatsapp
evolution_instance: Libertalia_Properties
max_auto_sends_per_lead: 1
future_messages: human_approval_required
prompt_version: property24_first_touch_v1
```

Move to `mode: autosend` only after the certification gates pass.

---

## 8. Safe Implementation Path

### Phase 0 — Architecture cleanup / versioning

No outbound sends.

- Confirm where `ai_message_drafts` is created today.
- Bring draft generation into repo if currently out-of-band.
- Add tenant policy table or equivalent config.
- Add first-touch run/idempotency table.
- Decide canonical WhatsApp conversation external id format.

Exit evidence:

- migration dry-run reviewed
- no active sends
- docs updated

### Phase 1 — Dry-run first-touch worker

No outbound sends.

- Worker consumes Property24 `message.received` events.
- It resolves policy and target WhatsApp conversation.
- It generates/stores a draft.
- It logs what would have been sent.
- It marks run status `dry_run` / event processed.

Exit evidence:

- controlled Property24 test creates lead/source conversation/source message
- target WhatsApp conversation is created/linked
- draft appears in approval queue
- no Evolution API call is made

### Phase 2 — Governed first-touch autosend in staging

Autosend only in staging/test tenant.

- Add narrow first-touch auto-approval/send path.
- Use same prepare/send/finalize audit model.
- Send to consenting test recipient only.
- Verify duplicate event/replay cannot send twice.
- Verify a second inbound message creates normal draft only.

Exit evidence:

- first message sent once
- duplicate replay blocked
- outbound message has `draft_id`
- audit logs and `message.sent` automation event exist
- second/future AI reply waits in approval queue

### Phase 3 — Single-tenant canary

Enable one tenant only, preferably Libertalia after WhatsApp certification.

- `mode: autosend`
- low-volume monitor window
- alert on failures
- manual operator fallback ready
- daily review of all first-touch messages

Exit evidence:

- first real Property24 lead receives one qualification message
- reply lands in governed inbox
- follow-up draft requires approval
- no duplicate first touch

### Phase 4 — Broader rollout

Only after canary success.

- keep default disabled
- enable per tenant after checklist
- create tenant-specific prompt overrides only when approved
- add monitoring dashboard for proactive sends, failures, and approval queue throughput

---

## 9. Validation Matrix

| Test | Expected result |
| --- | --- |
| Unsigned Property24 request | Rejected. |
| Bad signature/timestamp | Rejected. |
| Duplicate idempotency key | No duplicate lead/message/send. |
| Valid new Property24 lead, dry-run policy | Lead + source conversation + message + draft; no outbound send. |
| Valid new Property24 lead, autosend policy | One first qualification message sent through Evolution and finalized. |
| Existing lead matched by phone/email | No duplicate lead; first-touch eligibility still checks previous sends. |
| Missing phone | No autosend; draft/task/manual follow-up only. |
| No certified Evolution channel | No autosend; event failed/held with clear reason. |
| Recipient is instance owner | Send blocked by Evolution helper. |
| Second Property24 event for same lead | No second proactive first touch. |
| WhatsApp reply after first touch | Inbound appears; AI response goes to approval queue, not autosend. |
| Human approval after reply | Existing governed approval/send path works. |
| Transport failure | Outbound message finalized as failed; run can retry safely without duplicate sent state. |
| Tenant disabled | No autosend regardless of source. |
| Global outbound disabled | No external send; dry-run/draft-only behavior. |

---

## 10. Rollback / Kill Switch

Required controls:

1. Per-tenant policy `enabled=false`.
2. Per-tenant policy `mode=draft_only`.
3. Global `OUTBOUND_TRANSPORT_ENABLED=false`.
4. Disable the first-touch worker/n8n workflow.
5. Disable/remove Evolution instance mapping for the tenant.

Rollback behavior:

- Do not delete historical messages.
- Preserve audit logs and run records.
- Keep drafts visible for operator review.
- Failed/disabled proactive events should be marked `ignored` or `failed` with reason, not silently dropped.

---

## 11. Recommendation

Implement this as a **narrow, tenant-scoped first-touch automation**, not as a general AI autonomy change.

Best design:

1. Keep Property24 ingress exactly as source intake.
2. Trigger from `automation_events.message.received`.
3. Resolve/create a WhatsApp/Evolution engagement conversation for the same lead.
4. Generate a first qualification draft with strict prompt/template rules.
5. Auto-approve only through a new first-touch policy path.
6. Send using the existing governed prepare/send/finalize pattern.
7. Mark first-touch complete.
8. Route every future AI response through the existing approval queue.

This gives Kaylyn the desired high-speed lead response without breaking AgentFlow's core governance doctrine. Fast first touch; controlled everything after. ✦
