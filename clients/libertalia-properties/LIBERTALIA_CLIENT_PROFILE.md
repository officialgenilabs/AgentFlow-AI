# Libertalia Properties Client Profile

**Branch:** `client/libertalia-properties-pilot`
**Setup date:** 2026-06-09 UTC
**Client status:** First active AgentFlow AI pilot client
**Trial status:** 7-Day Free Trial
**Trial window:** 2026-06-09 to 2026-06-16 UTC
**Primary objective:** Get Kopano live and receiving operational value within 24–48 hours.

## Scope Lock

This is an onboarding implementation branch only.

**Allowed:**

- Client profile setup
- Primary agent setup
- Branding placeholders
- Property24 email ingestion planning
- WhatsApp / Evolution integration planning
- Lead qualification setup
- Viewing workflow setup
- Task generation setup
- Guided workspace view configuration

**Explicitly excluded:**

- Compliance workflows
- Advanced document verification
- LOOM integrations
- Seller workflows
- Canonical AgentFlow architecture changes
- New automation beyond existing AgentFlow capabilities

## Client

| Field | Value |
| --- | --- |
| Agency | Libertalia Properties |
| Organization slug | `libertalia-properties` |
| Client type | Real estate agency pilot |
| Trial status | 7-Day Free Trial |
| Activation target | First usable lead workflow within 24–48 hours |
| Primary value moment | Lead captured → qualified → viewing booking assisted |

## Primary Agent

| Field | Value |
| --- | --- |
| Name | Kopano Nkotsi |
| Role | Primary Agent |
| Agent slug | `kopano-nkotsi` |
| Default lead owner | Yes |
| Default task owner | Yes |
| Platform admin | No |
| Login email | Pending onboarding input |
| WhatsApp number | Pending onboarding input |

## Branding Placeholders

| Branding item | Value |
| --- | --- |
| Agency Name | Libertalia Properties |
| Logo | Pending agency logo asset |
| Primary Color | Pending client preference |
| Accent Color | Pending client preference |

Recommended temporary defaults until assets arrive:

| Field | Temporary value |
| --- | --- |
| Primary Color | `#111827` |
| Accent Color | `#d4af37` |
| Logo | Text fallback: `Libertalia Properties` |

## Dedicated Client Configuration Package

```yaml
client_config:
  organization:
    name: "Libertalia Properties"
    slug: "libertalia-properties"
    status: "7-day-free-trial"
    pilot_client: true
    trial_start_utc: "2026-06-09"
    trial_end_utc: "2026-06-16"

  primary_agent:
    name: "Kopano Nkotsi"
    slug: "kopano-nkotsi"
    role: "primary_agent"
    default_lead_owner: true
    default_task_owner: true
    platform_admin: false
    login_email: "TODO:onboarding"
    whatsapp_number: "TODO:onboarding"

  branding:
    agency_name: "Libertalia Properties"
    logo_asset: "TODO:onboarding:agency-logo"
    primary_color: "TODO:onboarding:primary-color"
    accent_color: "TODO:onboarding:accent-color"

  channels:
    property24_email:
      enabled: true
      profile_url: "TODO:onboarding:property24-profile-url"
      forwarding_email: "TODO:onboarding:property24-lead-forwarding-email"
      mode: "existing_agentflow_email_ingestion"

    whatsapp_evolution:
      enabled: true
      provider: "Evolution API"
      whatsapp_number: "TODO:onboarding:whatsapp-number"
      mode: "existing_agentflow_whatsapp_capability"

  workflow_stages:
    - "Lead Received"
    - "Qualification"
    - "Viewing Requested"
    - "Viewing Booked"

  guided_workspace_views:
    - "New Leads"
    - "Awaiting Qualification"
    - "Viewing Requests"
    - "Booked Viewings"
    - "Follow-Up Required"

  first_48h_success_metric:
    - "Kopano receives a lead"
    - "AgentFlow qualifies the lead"
    - "AgentFlow assists with viewing booking"
    - "Kopano sees immediate operational value"

  exclusions:
    - "compliance_workflows"
    - "advanced_document_verification"
    - "loom_integrations"
    - "seller_workflows"
    - "canonical_architecture_changes"
```

## Initial Operational Workflow

1. **Lead Received**
   - New inbound Property24 or WhatsApp lead enters AgentFlow.
   - Lead is assigned to Kopano by default.
   - Lead appears in **New Leads**.

2. **Qualification**
   - AgentFlow captures/organizes minimum viable qualification context:
     - Name
     - Contact detail
     - Property/source reference
     - Buy/rent intent if available
     - Area/property interest
     - Budget if available
     - Timing/urgency if available
     - Viewing interest
   - Lead appears in **Awaiting Qualification** until minimum context is captured.

3. **Viewing Requested**
   - Lead indicates interest in viewing or asks for availability.
   - AgentFlow assists Kopano with a concise next-step response and task.

4. **Viewing Booked**
   - Viewing date/time is confirmed manually by Kopano or captured from conversation.
   - Task is created/updated for Kopano.
   - Lead appears in **Booked Viewings**.
   - Phase 1 ends at the booked-viewing handoff; post-viewing outcomes are parked for a later phase.

## Guided Workspace Views

| View | Purpose | Primary filter |
| --- | --- | --- |
| New Leads | Fresh inbound leads requiring first action | Stage = Lead Received |
| Awaiting Qualification | Leads missing core qualification context | Stage = Qualification |
| Viewing Requests | Leads ready for booking coordination | Stage = Viewing Requested |
| Booked Viewings | Leads with booked upcoming viewings | Stage = Viewing Booked |
| Follow-Up Required | Leads needing a qualification/viewing-booking next action | Open follow-up task exists |

## Activation Principle

The first 24–48 hours are successful if Kopano can see real leads, understand what needs to happen next, and use AgentFlow to move a lead to **Viewing Requested** or **Viewing Booked** without extra admin burden.
