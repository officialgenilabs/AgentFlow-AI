# Libertalia Properties — Property24 Intake Setup

**Client:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Branch:** `client/libertalia-properties-pilot`
**Purpose:** convert Property24 enquiry emails into AgentFlow leads without changing canonical architecture.

## 1. Important Architecture Note

The current AgentFlow branch already contains a Property24 ingress endpoint:

```text
POST /api/ingress/property24
```

That endpoint expects **signed JSON**, not raw forwarded email.

Therefore the Phase 1 email intake pattern is:

```text
Property24 enquiry email
  → dedicated Libertalia intake mailbox
  → pilot email parser / forwarding bridge
  → signed JSON POST to /api/ingress/property24
  → public.ingest_property24_lead(...)
  → Libertalia lead + conversation + inbound message
```

This is pilot configuration around existing ingress capability. It must not become a canonical architecture rewrite.

## 2. Required Client Inputs

| Status | Input | Example / notes |
| --- | --- | --- |
| [ ] | Property24 profile URL | Required to identify source/account context |
| [ ] | Property24 account/admin access holder | Person who can change enquiry email settings |
| [ ] | Current enquiry destination email | Where Property24 sends leads today |
| [ ] | Dedicated intake mailbox | Recommended: `leads@libertaliaproperties.co.za` or temporary founder-managed inbox |
| [ ] | Sample Property24 lead email | Needed to verify parser fields |
| [x] | Kopano login email | `kopano@libertaliaproperties.co.za` — active AgentFlow login |
| [x] | Kopano mobile/WhatsApp | 063 499 3639 / +27634993639 |

Do not request compliance, application forms, rental forms, FICA documents, mandates, or OTP documents for Phase 1.

## 3. Property24 Email Delivery Configuration

Inside Property24 / agency lead delivery settings:

1. Confirm the active Libertalia profile/account.
2. Set or forward enquiry delivery to the dedicated pilot intake mailbox.
3. Ensure emails include, where Property24 provides them:
   - Lead/enquiry id
   - Contact name
   - Phone number
   - Email address
   - Listing/property reference
   - Property title/address snippet
   - Message/enquiry body
   - Received timestamp
4. Preserve the original email body when forwarding.
5. Do not route non-Property24 business mail through this intake.

## 4. Pilot Email Parser Requirements

The parser/bridge must produce one canonical JSON payload per Property24 enquiry.

### Required JSON fields

| Canonical field | Source from email | Required? |
| --- | --- | --- |
| `lead_id` or `enquiry_id` | Property24 enquiry id, message id, or stable generated id | Yes |
| `full_name` or `name` | Lead contact name | Yes |
| `message` | Enquiry message/body | Yes |
| `email` | Lead email | Strongly recommended |
| `phone` | Lead phone/mobile | Strongly recommended |
| `listing_reference` or `property_reference` | Listing/property ref | Recommended |
| `property_title` | Listing title/address snippet | Recommended |
| `occurred_at` | Original enquiry time | Recommended |
| `raw_payload` | Original parsed source fields | Recommended |

### Accepted payload shape

The existing route accepts flexible keys, including:

```json
{
  "organization_slug": "libertalia-properties",
  "lead_id": "P24-EXAMPLE-001",
  "message_id": "P24-EXAMPLE-001-email-1",
  "full_name": "Example Lead",
  "email": "lead@example.com",
  "phone": "+27XXXXXXXXX",
  "message": "Hi, I am interested in viewing this property.",
  "listing_reference": "P24-123456789",
  "property_title": "2 Bedroom Apartment in Example Area",
  "occurred_at": "2026-06-10T11:00:00Z"
}
```

## 5. Signed Ingress Configuration

The bridge must call:

```text
POST <AGENTFLOW_BASE_URL>/api/ingress/property24
```

Required headers:

| Header | Value |
| --- | --- |
| `content-type` | `application/json` |
| `x-agentflow-org-slug` | `libertalia-properties` |
| `x-agentflow-idempotency-key` | Stable key, e.g. `property24:<enquiry_id>` |
| `x-agentflow-timestamp` | Unix seconds or milliseconds |
| `x-agentflow-signature` | `sha256=<hex_hmac>` |

Signature algorithm:

```text
HMAC_SHA256(PROPERTY24_INGRESS_SECRET, "<timestamp>.<raw_json_body>")
```

Rules:

- The raw JSON string used for signing must be exactly the body sent.
- The secret is server-side only.
- Never send the secret to Libertalia, Property24, or any public repo.
- The endpoint enforces timestamp skew using `PROPERTY24_INGRESS_SKEW_SECONDS` when configured.
- Duplicate replay keys should return duplicate/idempotency protection instead of creating duplicate leads.

## 6. Environment / Server Values

| Value | Required? | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Existing app env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Existing app env |
| `PROPERTY24_INGRESS_SECRET` | Yes | Must match DB digest in `app_private.ingress_endpoint_secrets` |
| `PROPERTY24_INGRESS_SKEW_SECONDS` | Recommended | Default route fallback is `300` seconds |
| `PROPERTY24_DEFAULT_ORG_SLUG` | Optional | For pilot env only; use `libertalia-properties` if bridge cannot send org slug |

## 7. Database/RPC Behavior To Expect

The existing `public.ingest_property24_lead(...)` path should:

1. Validate server-held ingress secret.
2. Resolve organization by slug.
3. Create or activate a Property24 channel for the organization.
4. Match an existing lead by email/phone if possible.
5. Create a new lead if no strong match exists.
6. Create or attach a conversation using the external lead id.
7. Insert an inbound message.
8. Emit `conversation.created` and/or `message.received` automation events.
9. Preserve Property24 metadata in lead/message payloads.

Activation gap to watch:

- The RPC creates the lead but does not hard-code Kopano ownership. Ensure Kopano assignment is handled by org-specific config/manual update during Phase 1.

## 8. Lead Field Mapping

| AgentFlow field | Pilot mapping |
| --- | --- |
| Organization | `libertalia-properties` |
| `exact_source` | `property24` |
| `source_subtype` | `lead_portal` |
| `original_inbound_channel` | Property24 channel id created by RPC |
| `source_reference` | Listing/property reference, fallback to external lead id |
| `full_name` | Property24 lead name |
| `email` | Lead email if supplied |
| `phone` | Lead phone/mobile if supplied |
| `status` | `new` at capture |
| `priority` | `medium` by default |
| `pipeline_stage_id` | Set/updated to `Lead Received` for pilot workflow |
| `lead_origin_metadata` | Include raw Property24 context and pilot marker |

## 9. Qualification Extraction Rules

The parser should not overreach. Extract only what is clearly present.

| Context | How to handle |
| --- | --- |
| Viewing request present | Move/recommend move to **Viewing Requested** after Kopano review |
| Budget mentioned | Capture as note/context if available |
| Area/property preference | Capture from listing/property title/message |
| Timing/urgency | Capture if message says today/weekend/ASAP/etc. |
| Missing phone/email | Flag for Kopano; do not block lead creation if minimum required route fields exist |
| Compliance/application docs mentioned | Ignore for Phase 1, optionally note as parked context |

## 10. Test Plan

### Test A — unsigned payload rejection

- Send payload without signature.
- Expected: request rejected.
- Pass condition: no lead created.

### Test B — signed Property24 test lead

- Send signed canonical JSON with org slug `libertalia-properties`.
- Expected: HTTP 201 with result object.
- Pass condition: lead, channel, conversation, inbound message created.

### Test C — duplicate replay key

- Re-send the same body/key.
- Expected: duplicate protection.
- Pass condition: no duplicate lead/message.

### Test D — workflow progression

- Open lead as Kopano/founder.
- Review generated/guided next action.
- Move stage to **Qualification** or **Viewing Requested** depending on message.
- Pass condition: lead reaches **Viewing Requested** when viewing intent exists.

## 11. Go-Live Acceptance

Property24 intake is ready when:

```text
Property24 email sample
  → parser extracts canonical fields
  → signed ingress accepted
  → lead appears under Libertalia Properties
  → conversation contains inbound message
  → Kopano can see next action
  → stage can reach Viewing Requested
```
