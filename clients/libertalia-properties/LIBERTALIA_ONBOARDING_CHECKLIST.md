# Libertalia Properties Onboarding Checklist

**Client:** Libertalia Properties  
**Primary user:** Kopano Nkotsi  
**Trial status:** 7-Day Free Trial  
**Target:** Operational value within 24–48 hours

## Required Before Go-Live

| Status | Item | Owner | Notes |
| --- | --- | --- | --- |
| [ ] | Property24 Profile URL | Kopano / Libertalia | Needed to confirm the source profile and listing context. |
| [ ] | Property24 Lead Forwarding Email | Kopano / Libertalia | Needed to route Property24 lead emails into AgentFlow ingestion. |
| [ ] | WhatsApp Number | Kopano / Libertalia | Needed for Evolution WhatsApp integration and lead response flow. |
| [ ] | Agency Logo | Kopano / Libertalia | Used for client workspace branding. |

## Branding Inputs

| Status | Item | Value |
| --- | --- | --- |
| [x] | Agency Name | Libertalia Properties |
| [ ] | Logo | Pending |
| [ ] | Primary Color | Pending |
| [ ] | Accent Color | Pending |

Temporary branding may use a text logo and neutral colors until assets are supplied.

## Optional Inputs

These are useful, but they must not block the 24–48 hour pilot activation.

| Status | Optional item | Trial handling |
| --- | --- | --- |
| [ ] | Application Forms | Store as reference only if provided. No advanced document verification. |
| [ ] | Rental Forms | Store as reference only if provided. No compliance workflow. |
| [ ] | Offer To Purchase Documents | Store as reference only if provided. No seller workflow or contract automation. |

## Minimum Viable Activation Checklist

| Status | Activation item | Acceptance check |
| --- | --- | --- |
| [ ] | Create Libertalia Properties client profile | Organization profile exists in client config package. |
| [ ] | Create Kopano as primary agent | Kopano is default lead/task owner in client config package. |
| [ ] | Apply branding placeholders | Agency name and placeholder colors/logo are configured. |
| [ ] | Configure workflow stages | Lead Received → Qualification → Viewing Requested → Viewing Booked → Viewing Completed. |
| [ ] | Configure guided views | New Leads, Awaiting Qualification, Viewing Scheduled, Viewing Completed, Follow-Up Required. |
| [ ] | Property24 email path ready | Forwarding email supplied and test lead can be ingested. |
| [ ] | WhatsApp path ready | WhatsApp number supplied and Evolution path can be tested. |
| [ ] | Lead qualification path ready | AgentFlow can capture basic intent, budget/area/timing, and viewing interest. |
| [ ] | Viewing scheduling path ready | AgentFlow can assist with next step and create/update a viewing task. |
| [ ] | First value proof completed | Kopano sees a lead move from received to qualified/viewing-assisted. |

## First Lead Test Script

Use one real or controlled test lead. Keep it simple.

1. Lead arrives from Property24 email or WhatsApp.
2. AgentFlow creates/captures the lead under Libertalia Properties.
3. Lead is assigned to Kopano.
4. Lead appears in **New Leads**.
5. AgentFlow extracts or asks for the minimum useful qualification context.
6. Lead moves to **Qualification** or **Viewing Requested**.
7. AgentFlow creates a follow-up or viewing task for Kopano.
8. Kopano can act without manually reconstructing the conversation.

## Out-of-Scope During Trial Activation

- Compliance workflows
- FICA or document verification
- Advanced rental application processing
- Offer-to-purchase automation
- Seller mandate workflows
- LOOM integrations
- Custom architecture changes
- Any automation not already supported by AgentFlow

## Readiness Decision

Libertalia is ready for the live pilot once all required inputs are supplied and one inbound lead test proves:

**Lead received → lead qualified → viewing booking assisted → task visible to Kopano.**
