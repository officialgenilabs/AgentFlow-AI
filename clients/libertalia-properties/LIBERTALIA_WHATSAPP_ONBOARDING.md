# Libertalia Properties — WhatsApp Onboarding Through Evolution

**Client:** Libertalia Properties
**Primary user:** Kopano Nkotsi
**Branch:** `client/libertalia-properties-pilot`
**Purpose:** enable WhatsApp-assisted qualification and viewing booking for the Libertalia pilot.

## 1. Scope

WhatsApp in Phase 1 is only for:

- Responding to captured leads
- Asking one useful qualification question at a time
- Sharing/confirming viewing availability
- Tracking follow-up tasks and lead progression

Not included:

- Compliance requests
- Document verification
- Seller workflows
- Unreviewed bulk outbound
- Architecture changes

## 2. Current Transport Reality

The branch has existing Evolution send support in `src/lib/evolution.ts`, but recent outbound audit found the active `AgentFlow_Primary` instance was closed/unhealthy and not certifiable for outbound send at that time.

Phase 1 rule:

> Do not promise live WhatsApp outbound until the Evolution instance mapped to Libertalia is connected and a controlled smoke test confirms recipient receipt.

Guided follow-up can still be generated for Kopano to review/copy/send manually if transport is not certified yet.

## 3. Required Inputs From Libertalia / Kopano

| Status | Input | Notes |
| --- | --- | --- |
| [ ] | WhatsApp Business number | Dedicated number preferred |
| [ ] | QR scan owner | Kopano or authorized operator with device access |
| [ ] | Consent to connect via Evolution | Client must understand this links their WhatsApp session |
| [ ] | Preferred first-response tone | Short, professional, viewing-oriented |
| [ ] | Viewing availability windows | Used for guided booking suggestions |
| [ ] | Out-of-hours preference | Manual follow-up vs next-business-day message |
| [ ] | Test recipient number | Must not be the same as the Evolution instance owner |

## 4. Recommended Evolution Instance

Use a dedicated client-scoped instance name:

```text
Libertalia_Properties
```

If using an existing shared instance temporarily, document the exception and do not treat it as final pilot setup.

### Required server-side values

| Value | Notes |
| --- | --- |
| `EVOLUTION_API_BASE_URL` or `EVOLUTION_API_URL` | Existing secure AgentFlow environment value |
| `EVOLUTION_API_KEY` or `EVOLUTION_APIKEY` | Server-side only; never document or send |
| `EVOLUTION_INSTANCE_NAME` or per-channel instance value | `Libertalia_Properties` recommended |

## 5. Onboarding Flow

### Step 1 — Create or reset Evolution instance

- Create instance: `Libertalia_Properties`.
- Confirm provider integration is WhatsApp/Baileys or the configured Evolution WhatsApp mode.
- Ensure instance is isolated from unrelated client routing.

### Step 2 — Scan QR

- Generate QR for `Libertalia_Properties`.
- Kopano/authorized operator scans using WhatsApp Business.
- Keep the device/session stable during certification.

### Step 3 — Confirm connection state

Instance must report connected/open before outbound certification.

Acceptance:

```text
instance: Libertalia_Properties
state: open/connected
```

No-go if state is:

- `close`
- logged out
- reconnecting repeatedly
- missing Baileys client/socket symptoms

### Step 4 — Register AgentFlow channel mapping

Map the Evolution instance to Libertalia only.

| Field | Pilot value |
| --- | --- |
| Organization | `libertalia-properties` |
| Provider | `evolution` |
| Channel type | `whatsapp` |
| Display name | `Libertalia WhatsApp` |
| External channel id / instance | `Libertalia_Properties` |
| Status | `active` only after connection verified |
| Default owner | Kopano Nkotsi |

### Step 5 — Inbound smoke test

From a consenting test number, send:

```text
Hi, I am interested in viewing a Libertalia property.
```

Pass conditions:

- Inbound webhook receives event.
- Conversation appears under Libertalia.
- Lead is matched/created using phone identity.
- Conversation is visible to Kopano/founder.

### Step 6 — Outbound smoke test

Send a controlled message to a consenting test number that is **not** the instance owner.

Recommended text:

```text
Hi, this is a Libertalia AgentFlow pilot test. Please confirm received.
```

Pass conditions:

- AgentFlow send path returns success/submission.
- Evolution returns external message id or accepted send object.
- Recipient device confirms message received.
- AgentFlow does not label pending submission as final delivery unless delivery receipt exists.

No-go conditions:

- Evolution returns HTTP 500.
- Error mentions `onWhatsApp` undefined.
- Instance state is closed.
- Recipient is the same number as the instance owner.
- Message only appears as `PENDING` with no recipient confirmation and the pilot depends on delivery proof.

## 6. Guided Follow-Up Rules

AgentFlow should guide Kopano with concise draft responses. Kopano remains in control.

### Default first response

```text
Hi {{lead_first_name}}, thanks for your enquiry about {{property_reference_or_title}}. Are you available for a viewing this week? I can help confirm a suitable time.
```

### If budget/context is missing but viewing intent is clear

```text
Hi {{lead_first_name}}, happy to help arrange a viewing. Before I confirm slots, are you looking to buy or rent, and what timing works best for you?
```

### If lead asks for viewing immediately

```text
Hi {{lead_first_name}}, yes, we can look at viewing options for {{property_reference_or_title}}. Which day/time suits you best, or should I send available slots?
```

### If no response after first follow-up

```text
Hi {{lead_first_name}}, just following up on your Property24 enquiry for {{property_reference_or_title}}. Would you still like to arrange a viewing?
```

## 7. Lead Progression Rules From WhatsApp

| Signal | Stage action | Task action |
| --- | --- | --- |
| New inbound WhatsApp enquiry | Lead Received | Review and qualify lead |
| Lead answers qualification question | Qualification | Update context note |
| Lead asks to view / accepts viewing discussion | Viewing Requested | Confirm available slots |
| Date/time confirmed | Viewing Booked | Create viewing task for Kopano |
| No reply after follow-up | Keep current stage | Create follow-up task |

## 8. Operator Safety Rules

- Do not send documents or compliance requests in Phase 1.
- Do not automate seller-side messages.
- Do not run bulk outreach.
- Do not send from a closed/unhealthy Evolution instance.
- Do not test by sending to the instance owner number.
- If transport is uncertain, generate the draft and let Kopano send manually from WhatsApp Business.

## 9. WhatsApp Certification Checklist

| Status | Check | Evidence |
| --- | --- | --- |
| [ ] | Instance exists | Instance name recorded |
| [ ] | QR scanned | Screenshot/status note |
| [ ] | Connection state open | API/status evidence |
| [ ] | Inbound test received | Conversation/message id |
| [ ] | Outbound test submitted | Message id/API response |
| [ ] | Recipient confirms receipt | Screenshot/manual confirmation |
| [ ] | Kopano knows send process | Operator walkthrough complete |

## 10. Go-Live Position

WhatsApp is pilot-ready only when:

```text
Evolution instance connected
  → inbound test appears in Libertalia workspace
  → guided draft is generated/reviewed
  → outbound smoke test reaches consenting recipient
  → lead can move toward Viewing Requested / Viewing Booked
```

If outbound certification is not ready, Phase 1 can still proceed with **guided follow-up + manual WhatsApp send** while Property24 intake and workflow proof continue.
