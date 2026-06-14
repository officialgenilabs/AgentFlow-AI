# Libertalia Properties — First-Day Operator Guide

**Operator:** Kopano Nkotsi
**Client:** Libertalia Properties
**Pilot:** AgentFlow AI Phase 1
**Goal:** turn Property24 leads into qualified viewing opportunities.

## 1. Your Pilot Mission

For this pilot, AgentFlow has one job:

```text
Lead → Qualification → Viewing Booking
```

Your first-day success target:

> A Property24 lead enters AgentFlow and reaches **Viewing Requested**.

Do not worry about compliance, documents, seller workflows, or application processing in Phase 1.

## 2. The Four Lead Stages

| Stage | What it means | Your action |
| --- | --- | --- |
| Lead Received | A new Property24/WhatsApp lead arrived | Open it and review context |
| Qualification | You need useful context | Ask one next useful question |
| Viewing Requested | The lead wants/should be offered a viewing | Confirm availability/options |
| Viewing Booked | A date/time is agreed | Create/confirm viewing task |

## 3. Start-of-Day Routine

1. Log into AgentFlow.
2. Open the Libertalia workspace.
3. Check **New Property24 Leads**.
4. Open each new lead.
5. Check the lead details:
   - Name
   - Phone/email
   - Property/listing reference
   - Message
   - Source = Property24
   - Current stage
   - Next task/recommended follow-up
6. Respond or prepare a response.
7. Move the lead to the correct stage.

## 4. Handling a New Property24 Lead

When a lead arrives:

### Step 1 — Confirm basic context

Look for:

- Who is the person?
- Which property are they asking about?
- Did they ask a question or request a viewing?
- Is a phone number available?
- Is the next action obvious?

### Step 2 — Use the guided follow-up

AgentFlow may suggest a draft. Review before sending.

Default response:

```text
Hi {{first_name}}, thanks for your enquiry about {{property_reference_or_title}}. Are you available for a viewing this week? I can help confirm a suitable time.
```

If you need more context:

```text
Hi {{first_name}}, thanks for your enquiry. Are you looking to buy or rent, and would you like to arrange a viewing for {{property_reference_or_title}}?
```

If they already asked for a viewing:

```text
Hi {{first_name}}, yes, we can look at viewing options for {{property_reference_or_title}}. Which day/time suits you best?
```

### Step 3 — Move the stage

- If you sent/reviewed the first response but still need answers: move to **Qualification**.
- If they asked for a viewing or the next action is to offer slots: move to **Viewing Requested**.
- If date/time is confirmed: move to **Viewing Booked**.

## 5. What To Ask During Qualification

Ask only what helps move toward a viewing.

Good Phase 1 questions:

- “Are you looking to buy or rent?”
- “Would you like to arrange a viewing?”
- “Which day/time works best for you?”
- “Is this property still the one you are interested in?”
- “What area or property type are you looking for?”
- “What budget range should I keep in mind?”

Avoid in Phase 1:

- “Please upload documents.”
- “Please complete FICA.”
- “Send bank statements/payslips.”
- Seller mandate questions.
- Contract or offer-to-purchase automation.

## 6. Booking a Viewing

When a lead is ready for a viewing:

1. Move the lead to **Viewing Requested**.
2. Ask for availability or offer slots.
3. Once a slot is agreed, move the lead to **Viewing Booked**.
4. Create or confirm a task with:
   - Lead name
   - Property reference/title
   - Viewing date/time
   - Contact number
   - Any notes from the conversation

Viewing task title format:

```text
Viewing: {{lead_name}} — {{property_reference_or_title}}
```

Task description format:

```text
Lead requested viewing via Property24/WhatsApp.
Property: {{property_reference_or_title}}
Phone: {{phone}}
Agreed time: {{viewing_time}}
Notes: {{important_context}}
```

## 7. WhatsApp Handling

If WhatsApp is fully connected and certified:

- Use AgentFlow guided drafts.
- Review before sending.
- Keep responses short and viewing-oriented.

If WhatsApp transport is not certified yet:

- Use AgentFlow to generate/review the reply.
- Copy/send manually from WhatsApp Business.
- Update the lead stage/task in AgentFlow after sending.

## 8. First-Day Success Script

Use this sequence for the first real or test lead:

1. Open new Property24 lead.
2. Confirm lead source and property reference.
3. Send/review first guided follow-up.
4. Move lead to **Qualification**.
5. If the lead wants to view, move to **Viewing Requested**.
6. Create a task: “Confirm viewing availability”.
7. If time is agreed, move to **Viewing Booked**.
8. Add a short note summarizing the conversation.

## 9. What Good Looks Like

A good first-day AgentFlow record has:

- Lead captured from Property24
- Correct phone/email if available
- Property reference/title visible
- Conversation history visible
- Stage updated
- Next action clear
- Viewing task created if needed

## 10. Escalate / Ask Founder If

- A Property24 lead does not appear.
- A lead appears under the wrong client/workspace.
- WhatsApp is not sending/receiving.
- You cannot move the lead stage.
- You are unsure whether something belongs to compliance/document workflows.

Default answer for scope questions:

> For Phase 1, we only handle lead capture, qualification, guided follow-up, and viewing booking.
