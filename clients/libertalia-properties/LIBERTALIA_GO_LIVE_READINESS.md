# Libertalia Properties Pilot — Go-Live Readiness Report

**Client:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Branch:** `client/libertalia-properties-pilot`
**Date:** 2026-06-10 UTC
**Prepared by:** Nova / Gen I Labs
**Pilot doctrine:** `Lead → Qualification → Viewing Booking` only

## 1. Executive Readiness Summary

Libertalia Phase 1 is structurally ready as a branch-scoped pilot package, but should be treated as **conditional go-live** until the missing client inputs and transport tests are completed.

### Current decision

```text
Status: CONDITIONAL GO-LIVE / NOT YET LIVE
Reason: client inputs, signed Property24 email bridge, Kopano access, and Evolution health certification still need final proof.
```

The activation should proceed only after a controlled end-to-end test proves:

```text
Property24 lead
  → AgentFlow Libertalia lead
  → guided qualification/follow-up
  → stage = Viewing Requested
```

## 2. Scope Confirmation

Included:

- Property24 lead capture
- Basic lead qualification
- Guided follow-up generation
- Viewing-request and viewing-booking assistance
- Lead progression tracking

Excluded:

- Compliance features
- Seller workflows
- Document verification
- Canonical architecture changes
- Rental application automation
- Offer-to-purchase workflows

No readiness item in this report requires changing canonical AgentFlow architecture.

## 3. Branch Package Audit

| Component | Status | Notes |
| --- | --- | --- |
| Branch | Ready | `client/libertalia-properties-pilot` exists and is active. |
| Client docs package | Ready after this activation set | Existing docs are expanded with go-live checklist, intake setup, WhatsApp onboarding, operator guide, readiness report. |
| Existing Property24 route | Available | `src/app/api/ingress/property24/route.ts` accepts signed JSON. |
| Existing Property24 RPC | Available | `public.ingest_property24_lead(...)` creates/matches lead, conversation, message, events. |
| Raw email ingestion | Needs bridge | Existing endpoint does not parse raw email directly. Pilot needs email parser/bridge. |
| Workflow stages | Config required | Use org-specific `lead_pipeline_stages`; no schema change. |
| Kopano default assignment | Config/manual step required | Existing RPC does not enforce default owner automatically. |
| Evolution WhatsApp | Needs certification | Recent audit found active shared instance not outbound-certifiable while closed. Use dedicated/repaired instance and smoke test. |

## 4. Readiness Matrix

| Area | Status | Blocker / next action |
| --- | --- | --- |
| Client identity | Amber | Confirm Kopano login email and WhatsApp number. |
| Branding | Amber | Logo/colors pending; placeholders are acceptable for go-live. |
| Property24 source | Amber | Need profile URL, current enquiry email, sample lead email. |
| Email-to-ingress bridge | Amber | Configure parser + HMAC signed JSON POST. |
| AgentFlow Property24 endpoint | Green | Existing endpoint/RPC available. |
| Libertalia workflow config | Amber | Apply pilot stages/views as org data. |
| Kopano operator readiness | Amber | Deliver guide and perform walkthrough. |
| WhatsApp inbound | Amber | Requires connected Evolution instance and inbound smoke test. |
| WhatsApp outbound | Red/Amber | Do not certify until instance is open and recipient confirms smoke test. |
| Scope discipline | Green | Phase 1 scope is narrow and documented. |

## 5. Required Configuration Values

### Client-supplied

- Kopano login email
- Kopano WhatsApp/mobile number
- Property24 profile URL
- Property24 lead/enquiry destination email
- Sample Property24 enquiry email
- Agency logo
- Preferred primary/accent colors
- Viewing availability windows
- Out-of-hours handling preference

### Founder/Nova configured

- Organization slug: `libertalia-properties`
- Primary user slug: `kopano-nkotsi`
- Default lead/task owner: Kopano Nkotsi
- Pilot stages:
  - `lead-received`
  - `qualification`
  - `viewing-requested`
  - `viewing-booked`
- Property24 org routing header: `x-agentflow-org-slug: libertalia-properties`
- Property24 ingress secret/digest
- Evolution instance: recommended `Libertalia_Properties`
- Guided follow-up templates
- Operator views/queues

## 6. Branding Placeholders

Use these until Libertalia supplies final assets:

```yaml
branding:
  agency_name: "Libertalia Properties"
  logo_url: null
  logo_fallback_text: "Libertalia Properties"
  primary_color: "#111827"
  secondary_color: "#F8FAFC"
  accent_color: "#D4AF37"
  theme_mode: "system"
```

Activation rule:

- Placeholder branding must not block go-live.
- Replace logo/colors later without changing pilot workflow.

## 7. Pilot Workflow Configuration

```yaml
pilot_workflow:
  doctrine: "Lead → Qualification → Viewing Booking"
  organization_slug: "libertalia-properties"
  default_owner: "kopano-nkotsi"
  stages:
    - name: "Lead Received"
      slug: "lead-received"
      position: 10
      probability: 10
      canonical_status: "new"
    - name: "Qualification"
      slug: "qualification"
      position: 20
      probability: 35
      canonical_status: "contacted"
    - name: "Viewing Requested"
      slug: "viewing-requested"
      position: 30
      probability: 65
      canonical_status: "qualified"
    - name: "Viewing Booked"
      slug: "viewing-booked"
      position: 40
      probability: 85
      canonical_status: "qualified"
  views:
    - "New Property24 Leads"
    - "Awaiting Qualification"
    - "Viewing Requests"
    - "Booked Viewings"
    - "Follow-Up Required"
```

## 8. End-to-End Go-Live Test

### Test input

A real or controlled Property24 enquiry containing:

- Lead name
- Phone or email
- Listing/property reference
- Message showing enquiry or viewing interest

### Expected system result

| Step | Expected evidence |
| --- | --- |
| Signed ingress accepted | HTTP success from `/api/ingress/property24` |
| Lead created/matched | Libertalia lead id exists |
| Conversation created/attached | Conversation id exists |
| Message inserted | Inbound Property24 message visible |
| Guided follow-up available | Draft/next action visible to operator |
| Kopano can act | Kopano sees lead/task |
| Stage progresses | Lead reaches **Viewing Requested** |

## 9. Go-Live Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Raw Property24 email sent directly to JSON endpoint | High | Use parser/bridge; do not forward raw email directly to endpoint. |
| Wrong org slug routes lead to wrong tenant | High | Hard-code `libertalia-properties` in bridge and verify test lead location. |
| Duplicate forwarded emails create duplicates | Medium | Use stable `x-agentflow-idempotency-key`. |
| Kopano not auto-assigned | Medium | Apply default owner config/manual assignment during go-live. |
| Evolution instance closed | High | Certify instance before live outbound; use manual WhatsApp send fallback. |
| Scope drift into documents/compliance | Medium | Park for Phase 2; do not implement now. |
| UI says sent/delivered before true delivery proof | Medium | Treat Evolution HTTP success as submitted unless recipient/receipt confirms. |

## 10. Go-Live Recommendation

Proceed with **Phase 1 activation setup** now, but do not declare live until these five gates pass:

1. Kopano user/login confirmed.
2. Property24 sample email is parsed into signed JSON.
3. Signed ingress creates a Libertalia lead/conversation/message.
4. Pilot workflow stages/views are applied and Kopano can see them.
5. One lead reaches **Viewing Requested** with a guided next action/task.

WhatsApp live send is a separate certification gate. If it is not ready, proceed with guided draft + manual send for day one.

## 11. Final Readiness Statement

Libertalia Properties is ready for a narrow AgentFlow pilot once the above gates are complete.

The pilot must be judged only on this success path:

```text
Property24 lead received
  → lead captured under Libertalia
  → useful qualification context visible
  → guided follow-up generated
  → viewing next step identified
  → lead moved to Viewing Requested
```

Everything else is deliberately out of scope.
