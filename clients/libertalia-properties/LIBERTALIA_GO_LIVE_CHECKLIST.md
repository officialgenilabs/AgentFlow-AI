# Libertalia Properties Pilot — Phase 1 Go-Live Checklist

**Client:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Branch:** `client/libertalia-properties-pilot`
**Activation doctrine:** `Lead → Qualification → Viewing Booking` only
**Pilot success metric:** a Property24 lead enters AgentFlow and reaches **Viewing Requested** within the pilot workflow.

## 0. Scope Lock

This checklist is branch-scoped and pilot-only.

### Allowed in Phase 1

- Libertalia client/profile configuration
- Kopano primary-user onboarding
- Property24 lead intake configuration
- WhatsApp/Evolution onboarding and transport readiness checks
- Guided follow-up drafts/prompts for Kopano
- Pilot CRM workflow stages and views
- Viewing-booking assistance and follow-up tasks

### Explicitly excluded

- Compliance features
- Seller workflows
- Document verification
- FICA/rental application automation
- Offer-to-purchase automation
- Canonical AgentFlow architecture changes
- Any production-wide schema redesign

## 1. Branch Package Audit

| Area | Finding | Activation action |
| --- | --- | --- |
| Branch | Current repo branch is `client/libertalia-properties-pilot`. | Keep all changes inside `clients/libertalia-properties/` or client-scoped runtime config. |
| Existing Libertalia docs | Existing package includes client profile, onboarding checklist, implementation plan, and trial metrics. | This file set upgrades the package into go-live activation docs. |
| Property24 ingress | Existing app route: `src/app/api/ingress/property24/route.ts`. It expects signed JSON, not raw email. | Use a pilot email/parser bridge that converts Property24 email into the existing signed JSON ingress format. |
| Property24 database path | Existing RPC: `public.ingest_property24_lead(...)`. It creates/attaches lead, channel, conversation, inbound message, and automation events. | Do not change schema. Configure client inputs and run signed test payload. |
| Workflow stages | Current platform supports organization-specific `lead_pipeline_stages`. | Create Libertalia-specific stages as data/config only. |
| Kopano ownership | Existing Property24 RPC creates the lead but does not hard-code Kopano as owner. | During go-live, set Kopano as default owner by client config/manual assignment or a pilot-only data operation. No canonical rewrite. |
| WhatsApp/Evolution | Existing `src/lib/evolution.ts` supports governed send, but recent audit found `AgentFlow_Primary` not outbound-certifiable while closed. | Use a dedicated Libertalia instance or reconnect/certify the active instance before live sends. Guided drafts can still be used before outbound certification. |

## 2. Required Client Configuration Values

Collect these before activation. Do not request compliance documents for Phase 1.

### Organization

| Status | Field | Required value | Owner |
| --- | --- | --- | --- |
| [ ] | Agency legal/trading name | `Libertalia Properties` | Client |
| [ ] | Workspace slug | `libertalia-properties` | Founder/Nova |
| [ ] | Primary office area/city | TODO | Client |
| [ ] | Default timezone | `Africa/Johannesburg` unless client states otherwise | Client |
| [ ] | Pilot start date | TODO | Founder/Nova |
| [ ] | Pilot end/date review | TODO | Founder/Nova |

### Primary user — Kopano Nkotsi

| Status | Field | Required value | Owner |
| --- | --- | --- | --- |
| [ ] | Full name | `Kopano Nkotsi` | Client |
| [ ] | Login email | TODO | Client |
| [ ] | Mobile/WhatsApp number | TODO | Client |
| [ ] | Role | Primary Agent | Founder/Nova |
| [ ] | Default lead owner | Yes | Founder/Nova |
| [ ] | Default task owner | Yes | Founder/Nova |
| [ ] | Platform admin | No | Founder/Nova |

### Branding placeholders

| Status | Field | Placeholder / required value |
| --- | --- | --- |
| [x] | Agency name | `Libertalia Properties` |
| [ ] | Logo asset | Pending client logo; temporary text fallback allowed |
| [ ] | Primary color | Pending client preference; temporary `#111827` |
| [ ] | Accent color | Pending client preference; temporary `#D4AF37` |
| [ ] | Secondary color | Temporary `#F8FAFC` |
| [ ] | Theme | Light/system unless client requests otherwise |

### Property24 intake

| Status | Field | Required value |
| --- | --- | --- |
| [ ] | Property24 profile URL | TODO |
| [ ] | Property24 account/admin contact | TODO |
| [ ] | Current Property24 enquiry destination email | TODO |
| [ ] | Dedicated pilot inbox | Recommended: `leads@<client-domain>` or founder-managed pilot inbox |
| [ ] | Forwarding destination/parser | TODO — must preserve raw email body |
| [ ] | AgentFlow org slug header | `libertalia-properties` |
| [ ] | Signed ingress endpoint | `/api/ingress/property24` |
| [ ] | Ingress secret configured | Yes — server-side only; never place in docs or client messages |
| [ ] | Test Property24 lead/sample email | TODO |

### WhatsApp/Evolution

| Status | Field | Required value |
| --- | --- | --- |
| [ ] | WhatsApp Business number | TODO |
| [ ] | Device owner who can scan QR | Kopano or authorized Libertalia operator |
| [ ] | Evolution instance name | Recommended: `Libertalia_Properties` |
| [ ] | Evolution API base URL | Existing OpenClaw/AgentFlow environment value; do not expose API key |
| [ ] | QR scan completed | Pending |
| [ ] | Connection state | Must be `open` / connected before live send certification |
| [ ] | Inbound webhook route | Existing AgentFlow/Evolution inbound path |
| [ ] | Outbound smoke test | Required before promising WhatsApp live send |

### Operational defaults

| Status | Field | Pilot value |
| --- | --- | --- |
| [ ] | Default lead source | `property24` |
| [ ] | Default lead source subtype | `lead_portal` |
| [ ] | Default priority | `medium`; raise to `high` when viewing time is urgent |
| [ ] | Default owner | Kopano Nkotsi |
| [ ] | First response style | Short, professional, viewing-oriented |
| [ ] | Core qualification fields | Name, phone/email, property/listing, intent, budget if natural, timing, viewing interest, next action |
| [ ] | Out-of-hours handling | TODO from Kopano |
| [ ] | Viewing availability windows | TODO from Kopano |

## 3. Pilot Workflow Configuration

Configure as Libertalia organization data only. Do not alter canonical migrations.

| Position | Stage name | Slug | Purpose | Suggested canonical `leads.status` | Qualification status |
| --- | --- | --- | --- | --- | --- |
| 10 | Lead Received | `lead-received` | New Property24/WhatsApp lead captured | `new` | `unqualified` |
| 20 | Qualification | `qualification` | Agent/Kopano confirms useful buying/renting/viewing context | `contacted` | `ai_review_pending` or `human_qualified` |
| 30 | Viewing Requested | `viewing-requested` | Lead wants or is ready to discuss a viewing | `qualified` | `human_qualified` |
| 40 | Viewing Booked | `viewing-booked` | Date/time is agreed and task exists | `qualified` | `human_qualified` |

### Stage transition rules

- **Lead Received → Qualification** when Kopano has sent/reviewed the first guided follow-up.
- **Qualification → Viewing Requested** when the lead asks to view, accepts viewing discussion, or the next action is to offer available slots.
- **Viewing Requested → Viewing Booked** only when date/time is confirmed.
- Do not add compliance/document/seller statuses to Phase 1.

### Guided views for Kopano

| View | Filter |
| --- | --- |
| New Property24 Leads | Org = Libertalia; source = Property24; stage = Lead Received |
| Awaiting Qualification | Stage = Qualification or missing budget/timing/viewing interest |
| Viewing Requests | Stage = Viewing Requested |
| Booked Viewings | Stage = Viewing Booked with open viewing task |
| Follow-Up Required | Open task assigned to Kopano and due today/overdue |

## 4. Go-Live Readiness Checklist

### A. Client and user setup

| Status | Item | Acceptance check |
| --- | --- | --- |
| [ ] | Libertalia organization exists or is ready to create | `libertalia-properties` slug reserved and isolated |
| [ ] | Kopano profile/user created | Login works |
| [ ] | Kopano linked to Libertalia org | Role is member/agent, not platform admin |
| [ ] | Kopano assigned as default owner | New pilot leads and tasks can be assigned to Kopano |
| [ ] | Branding placeholders applied | Workspace visually identifiable as Libertalia |

### B. Property24 intake setup

| Status | Item | Acceptance check |
| --- | --- | --- |
| [ ] | Property24 lead destination confirmed | Client confirms where Property24 currently sends leads |
| [ ] | Dedicated intake inbox/forwarding configured | Test email is received by parser bridge |
| [ ] | Parser maps email to canonical JSON | Required fields are extracted: external lead id, name, message body |
| [ ] | HMAC signing configured server-side | Endpoint rejects unsigned payload and accepts signed test payload |
| [ ] | Org slug fixed to Libertalia | No cross-tenant routing risk |
| [ ] | Replay key/idempotency configured | Duplicate test email does not create duplicate lead/message |
| [ ] | Property24 test lead ingested | Lead + conversation + inbound message exist under Libertalia |

### C. WhatsApp/Evolution setup

| Status | Item | Acceptance check |
| --- | --- | --- |
| [ ] | Dedicated Evolution instance created/reused safely | Instance is named and mapped to Libertalia |
| [ ] | QR scan complete | Connection state is `open` / connected |
| [ ] | Inbound WhatsApp test passed | Message appears in Libertalia conversation thread |
| [ ] | Outbound smoke test passed | A consenting non-owner test number receives a message |
| [ ] | Kopano understands guided send process | Drafts are reviewed before send |

### D. Operator workflow setup

| Status | Item | Acceptance check |
| --- | --- | --- |
| [ ] | Pilot stages configured | Lead Received, Qualification, Viewing Requested, Viewing Booked |
| [ ] | Guided views available | Kopano can find each queue quickly |
| [ ] | Qualification prompt template ready | Template asks only the next useful question |
| [ ] | Viewing-request template ready | Template offers/requests practical viewing slots |
| [ ] | Task template ready | Viewing/request follow-up task is created or manually creatable |
| [ ] | First-day guide delivered | Kopano knows what to do with first lead |

## 5. Founder Implementation Checklist

Use this section as the founder/Nova execution list.

### Before client call

- [ ] Confirm branch: `client/libertalia-properties-pilot`.
- [ ] Confirm no schema/migration changes are required for Phase 1.
- [ ] Prepare the five Libertalia activation docs.
- [ ] Prepare exact client input request: login email, WhatsApp number, Property24 profile URL, Property24 lead email, logo/colors, viewing windows.
- [ ] Decide whether go-live uses dedicated Evolution instance `Libertalia_Properties` or repaired existing instance.
- [ ] Prepare one controlled Property24 sample payload/email.

### During onboarding call with Kopano

- [ ] Confirm Kopano login email.
- [ ] Confirm WhatsApp number and QR scan owner.
- [ ] Confirm Property24 lead delivery settings.
- [ ] Confirm typical viewing availability windows.
- [ ] Confirm first-response tone and preferred qualification questions.
- [ ] Explain pilot scope: lead capture, qualification, guided follow-up, viewing booking only.
- [ ] Explicitly park compliance/documents/seller workflows for later.

### Technical activation

- [ ] Create/verify Libertalia organization.
- [ ] Create/verify Kopano user and membership.
- [ ] Apply branding placeholders.
- [ ] Apply pilot stages/views as org-specific config/data.
- [ ] Configure Property24 parser bridge to signed JSON ingress.
- [ ] Configure `PROPERTY24_DEFAULT_ORG_SLUG=libertalia-properties` only in pilot environment if needed.
- [ ] Configure/verify Property24 ingress secret in app env and matching DB digest.
- [ ] Create/verify Evolution instance and webhook mapping.
- [ ] Certify inbound WhatsApp.
- [ ] Certify outbound only after instance is connected and test message is received.

### Go-live proof

- [ ] Send controlled Property24 lead.
- [ ] Confirm lead created in Libertalia workspace.
- [ ] Confirm lead assigned/assignable to Kopano.
- [ ] Confirm conversation and inbound message created.
- [ ] Generate/review guided follow-up.
- [ ] Move lead to **Qualification** after first response/review.
- [ ] Move lead to **Viewing Requested** when viewing intent is present or next action is to propose viewing slots.
- [ ] Create viewing follow-up task for Kopano.
- [ ] Capture evidence: timestamp, lead id, stage, task id, screenshot/notes.

## 6. Go / No-Go Decision

### Go-live may proceed when

- All required client inputs are supplied or acceptable placeholders are confirmed.
- Property24 signed ingestion test passes for `libertalia-properties`.
- Kopano can log in and see the lead.
- Pilot stages are visible.
- A lead reaches **Viewing Requested** in the workflow.
- WhatsApp is either certified live or explicitly marked as guided/manual send until transport is certified.

### No-go / pause conditions

- Property24 input path cannot be tested.
- Org slug or channel mapping could route leads to the wrong tenant.
- Kopano cannot access the workspace.
- Evolution instance is closed/unhealthy but the pilot depends on live WhatsApp send.
- Any implementation request drifts into compliance, seller workflows, or document verification.

## 7. Definition of Done

Phase 1 activation is done when this evidence exists:

```text
Property24 test/real lead
  → signed AgentFlow ingress accepted
  → Libertalia lead created/matched
  → conversation + inbound message created
  → Kopano has a guided next action
  → lead stage = Viewing Requested
```
