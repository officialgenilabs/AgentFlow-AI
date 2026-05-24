import { resolveTenantBySlug } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import type { AiMessageDraft, Channel, Conversation, Lead, Message } from "@/lib/types";

export type ApprovalQueueItem = {
  id: string;
  leadId: string | null;
  leadName: string;
  propertyReference: string;
  inboundMessage: string;
  draftResponse: string;
  confidenceScore: number;
  memoryContext: string[];
  routingRationale: string;
  channel: string;
  status: "pending" | "hold" | "blocked";
  verificationStatus: string;
  governanceState: string;
  limitations: string[];
  nextAction: string;
  conversationId: string;
  sourceMessageId: string;
  draftStatus: AiMessageDraft["status"];
  createdAt: string;
};

export type ApprovalQueue = {
  tenant: Awaited<ReturnType<typeof resolveTenantBySlug>>;
  items: ApprovalQueueItem[];
};

type DraftRow = AiMessageDraft & {
  conversations?: (Conversation & {
    channels?: Pick<Channel, "display_name" | "provider" | "channel_type"> | Pick<Channel, "display_name" | "provider" | "channel_type">[] | null;
  }) | (Conversation & {
    channels?: Pick<Channel, "display_name" | "provider" | "channel_type"> | Pick<Channel, "display_name" | "provider" | "channel_type">[] | null;
  })[] | null;
  messages?: Pick<Message, "id" | "body" | "occurred_at" | "sender_display_name" | "raw_payload"> | Pick<Message, "id" | "body" | "occurred_at" | "sender_display_name" | "raw_payload">[] | null;
  leads?: Pick<Lead, "id" | "full_name" | "email" | "phone" | "identity_confidence" | "exact_source" | "source_subtype" | "source_reference" | "lead_origin_metadata"> | Pick<Lead, "id" | "full_name" | "email" | "phone" | "identity_confidence" | "exact_source" | "source_subtype" | "source_reference" | "lead_origin_metadata">[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function confidenceFrom(identity: unknown, context: Record<string, unknown>) {
  const explicit = numberValue(context.confidenceScore ?? context.confidence_score);
  if (explicit !== null) return Math.max(0, Math.min(100, Math.round(explicit)));

  const normalized = stringValue(identity)?.toLowerCase();
  if (normalized === "phone_email") return 96;
  if (normalized === "phone" || normalized === "email") return 88;
  if (normalized === "none") return 62;
  return 74;
}

function propertyReference(lead: DraftRow["leads"], message: DraftRow["messages"], context: Record<string, unknown>) {
  const resolvedLead = one(lead);
  const resolvedMessage = one(message);
  const raw = record(resolvedMessage?.raw_payload);
  return stringValue(context.property_reference)
    ?? stringValue(context.listing_reference)
    ?? stringValue(raw.property_reference)
    ?? stringValue(raw.listing_reference)
    ?? stringValue(raw.property_id)
    ?? stringValue(resolvedLead?.source_reference)
    ?? "Lead inquiry";
}

function memoryContext(lead: DraftRow["leads"], conversation: DraftRow["conversations"], context: Record<string, unknown>) {
  const resolvedLead = one(lead);
  const resolvedConversation = one(conversation);
  const history = Array.isArray(context.history_last_5) ? context.history_last_5.length : 0;
  const items = [
    `Source: ${resolvedLead?.exact_source ?? "inbound"}${resolvedLead?.source_subtype ? ` / ${resolvedLead.source_subtype}` : ""}`,
    `Identity: ${resolvedLead?.identity_confidence ?? "unverified"}`,
    `Thread: ${resolvedConversation?.status ?? "open"}${history ? ` · ${history} recent message${history === 1 ? "" : "s"}` : ""}`,
  ];
  return items;
}

export async function getApprovalQueue(orgSlug: string): Promise<ApprovalQueue> {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_message_drafts")
    .select("id, organization_id, conversation_id, message_id, lead_id, draft_content, status, generation_model, generation_context, edited_by_user_id, approved_by_user_id, approved_at, discarded_by_user_id, created_at, updated_at, conversations(id, organization_id, channel_id, lead_id, external_conversation_id, status, assigned_owner_user_id, subject, last_message_at, metadata, created_at, updated_at, channels(display_name, provider, channel_type)), messages(id, body, occurred_at, sender_display_name, raw_payload), leads(id, full_name, email, phone, identity_confidence, exact_source, source_subtype, source_reference, lead_origin_metadata)")
    .eq("organization_id", tenant.organization.id)
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  const items = ((data ?? []) as DraftRow[]).map((draft) => {
    const conversation = one(draft.conversations);
    const channel = one(conversation?.channels);
    const message = one(draft.messages);
    const lead = one(draft.leads);
    const context = record(draft.generation_context);
    const confidenceScore = confidenceFrom(lead?.identity_confidence ?? context.identity_confidence, context);

    return {
      id: draft.id,
      leadId: draft.lead_id,
      leadName: lead?.full_name ?? message?.sender_display_name ?? "Resolved lead",
      propertyReference: propertyReference(draft.leads, draft.messages, context),
      inboundMessage: message?.body ?? "Inbound source message unavailable",
      draftResponse: draft.draft_content,
      confidenceScore,
      memoryContext: memoryContext(draft.leads, draft.conversations, context),
      routingRationale: stringValue(context.routing_rationale)
        ?? "Draft generated from a governed inbound event. Outbound remains locked until certification gates pass.",
      channel: channel?.display_name ?? channel?.provider ?? "Inbound channel",
      status: confidenceScore < 70 ? "hold" : "pending",
      verificationStatus: `Identity ${lead?.identity_confidence ?? "pending"}`,
      governanceState: "Pending human approval",
      limitations: ["Outbound transport is frozen in Phase 10 until approval and audit evidence is certified."],
      nextAction: "Review, edit, approve, or discard the draft.",
      conversationId: draft.conversation_id,
      sourceMessageId: draft.message_id,
      draftStatus: draft.status,
      createdAt: draft.created_at,
    } satisfies ApprovalQueueItem;
  });

  return { tenant, items };
}
