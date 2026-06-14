# Libertalia Properties Implementation Plan

**Client:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Trial status:** 7-Day Free Trial
**Implementation mode:** Client onboarding only
**Time target:** 24–48 hours to visible value

## Implementation Guardrails

Do not expand scope.

This plan uses existing AgentFlow capabilities only:

- Existing lead/inbox foundations
- Existing Property24-oriented ingestion capability where available
- Existing WhatsApp / Evolution integration capability
- Existing lead qualification and task workflow patterns
- Existing controlled response / assisted workflow capabilities where already available

No canonical architecture changes are part of this branch.

Explicitly excluded:

- Compliance workflows
- Advanced document verification
- LOOM integrations
- Seller workflows
- New outbound automation outside existing AgentFlow controls
- New platform-wide schema redesigns

## Activation Timeline

### Phase 0 — Client Configuration Package

**Status:** Prepared in this branch.

Tasks:

1. Create Libertalia Properties client profile.
2. Configure Kopano Nkotsi as primary agent/default owner.
3. Define branding placeholders.
4. Define initial operational workflow.
5. Define guided workspace views.
6. Confirm onboarding inputs still needed.

Output files:

- `LIBERTALIA_CLIENT_PROFILE.md`
- `LIBERTALIA_ONBOARDING_CHECKLIST.md`
- `LIBERTALIA_IMPLEMENTATION_PLAN.md`
- `LIBERTALIA_TRIAL_SUCCESS_METRICS.md`

### Phase 1 — Minimum Live Input Collection

Target: same day.

Required from Kopano / Libertalia:

1. Property24 Profile URL
2. Property24 Lead Forwarding Email
3. WhatsApp Number
4. Agency Logo

Phase 2 parking lot, not required for Phase 1:

- Application Forms
- Rental Forms
- Offer To Purchase Documents

These documents must not be collected as an activation dependency and must not trigger compliance, verification, or seller workflows during Phase 1.

### Phase 2 — Ingestion Wiring

Target: first 24 hours after inputs.

#### Property24 Email Ingestion

Goal: Property24 leads should land in AgentFlow as Libertalia leads.

Implementation steps:

1. Confirm Libertalia's Property24 profile URL.
2. Confirm the Property24 lead forwarding email currently used by Kopano/agency.
3. Configure forwarding toward the existing AgentFlow ingestion path.
4. Map incoming lead fields to the minimum lead record:
   - Lead name
   - Email
   - Phone
   - Source = Property24
   - Property/listing reference if present
   - Message body
   - Requested property or area if present
5. Assign new Libertalia leads to Kopano by default.
6. Create a `Lead Received` event.
7. Place the lead in **New Leads**.
8. Run one controlled test lead before relying on production leads.

Acceptance check:

- A Property24 lead appears under Libertalia Properties, assigned to Kopano, without affecting other tenants.

#### WhatsApp Integration via Evolution

Goal: Kopano can handle WhatsApp lead conversations through the existing AgentFlow/Evolution path.

Implementation steps:

1. Confirm Kopano's active WhatsApp number.
2. Confirm Evolution instance readiness for the number.
3. Route inbound WhatsApp messages to the Libertalia workspace.
4. Attach WhatsApp conversations to the matching lead where phone identity matches.
5. If no lead exists, create a lead with source = WhatsApp.
6. Keep outbound behavior inside existing controlled AgentFlow response/send capability.
7. Test with one inbound WhatsApp lead message.

Acceptance check:

- A WhatsApp inquiry appears as a lead/conversation for Kopano and can be moved toward qualification or viewing.

### Phase 3 — Operational Workflow Setup

Target: first 24–48 hours.

Configure the initial workflow exactly as:

1. **Lead Received**
2. **Qualification**
3. **Viewing Requested**
4. **Viewing Booked**

Stage handling:

| Stage | Entry condition | Next useful action |
| --- | --- | --- |
| Lead Received | New Property24/WhatsApp lead captured | Review and start qualification |
| Qualification | Lead exists but needs context | Capture intent, budget/area/timing, viewing interest |
| Viewing Requested | Lead asks to view or shows viewing intent | Ask/confirm available slot and property details |
| Viewing Booked | Date/time agreed | Create viewing task and reminder |

### Phase 4 — Guided Workspace Views

Target: first 24–48 hours.

Configure these guided views for Kopano:

1. **New Leads**
   - Fresh leads in `Lead Received`.
2. **Awaiting Qualification**
   - Leads in `Qualification` or missing key context.
3. **Viewing Requests**
   - Leads in `Viewing Requested` needing slot coordination.
4. **Booked Viewings**
   - Leads in `Viewing Booked` with upcoming viewing task.
5. **Follow-Up Required**
   - Leads with open follow-up tasks after qualification or viewing-request coordination.

### Phase 5 — Lead Qualification

Goal: qualify enough to move the conversation toward a viewing, not to collect every possible form field.

Minimum useful qualification fields:

- Name
- Phone/email
- Source
- Property/listing interest
- Buy/rent intent if unclear
- Area preference
- Budget range if naturally available
- Timing/urgency
- Viewing interest
- Next action

AgentFlow behavior:

- Extract what is already in the inquiry.
- Ask only the next useful question.
- Prefer viewing progression over admin-heavy interrogation.
- Keep responses concise and operational.

Acceptance check:

- Kopano can open a lead and immediately see what is known, what is missing, and the recommended next action.

### Phase 6 — Viewing Scheduling

Goal: AgentFlow assists Kopano with booking, tracking, and following up on viewings.

Implementation steps:

1. Detect viewing intent from Property24/WhatsApp messages.
2. Move lead to **Viewing Requested**.
3. Create a task for Kopano to confirm availability if no date/time exists.
4. When a date/time is agreed, move lead to **Viewing Booked**.
5. Create a viewing task with:
   - Lead name
   - Property/listing reference
   - Date/time
   - Contact method
   - Notes/context
6. Phase 1 ends at the booked-viewing handoff. Post-viewing follow-up is parked unless manually handled by Kopano.

Acceptance check:

- A lead can move from request to booked viewing without Kopano losing context.

### Phase 7 — Task Generation

Initial task types only:

| Trigger | Task |
| --- | --- |
| New lead received | Review and qualify lead |
| Lead missing key context | Ask qualification question |
| Viewing requested | Confirm viewing availability |
| Viewing booked | Attend/prepare for viewing |
| No response after qualification | Follow up |

Default assignment:

- Owner: Kopano Nkotsi
- Client: Libertalia Properties
- Priority: normal unless viewing is time-sensitive

## First 48-Hour Proof

The branch is operationally successful when this sequence works:

1. Kopano receives a lead.
2. AgentFlow captures the lead under Libertalia Properties.
3. AgentFlow qualifies or identifies missing qualification context.
4. AgentFlow assists with viewing booking or creates the next viewing task.
5. Kopano can see the lead, status, and next action in the workspace.

Everything beyond that is Phase 2.
