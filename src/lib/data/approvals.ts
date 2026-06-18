import { resolveTenantBySlug } from "@/lib/data/auth";
import { buildLeadQualificationSummary } from "@/lib/data/qualification";
import { createClient } from "@/lib/supabase/server";
import type { AiMessageDraft, Channel, Conversation, Lead, LeadPipelineStage, LeadTask, Message } from "@/lib/types";

export type ApprovalQueueItem = {
  id: string;
  leadId: string | null;
  leadName: string;
  propertyReference: string;
  inboundMessage: string;
  draftResponse: string;
  confidenceScore: number;
  confidenceLabel: string;
  readinessScore: number;
  viewingReadiness: string;
  missingInformation: string[];
  recommendedAction: string;
  sourceTrust: string;
  sourceTrustScore: number;
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

type ApprovalLead = Pick<
  Lead,
  | "id"
  | "pipeline_stage_id"
  | "full_name"
  | "email"
  | "phone"
  | "identity_confidence"
  | "priority"
  | "estimated_value"
  | "exact_source"
  | "source_subtype"
  | "original_inbound_channel"
  | "source_reference"
  | "captured_at"
  | "first_contact_at"
  | "qualification_status"
  | "ai_qualification_decision_path"
  | "lead_origin_metadata"
>;

type DraftRow = AiMessageDraft & {
  conversations?: (Conversation & {
    channels?: Pick<Channel, "display_name" | "provider" | "channel_type"> | Pick<Channel, "display_name" | "provider" | "channel_type">[] | null;
  }) | (Conversation & {
    channels?: Pick<Channel, "display_name" | "provider" | "channel_type"> | Pick<Channel, "display_name" | "provider" | "channel_type">[] | null;
  })[] | null;
  messages?: Pick<Message, "id" | "body" | "occurred_at" | "sender_display_name" | "raw_payload"> | Pick<Message, "id" | "body" | "occurred_at" | "sender_display_name" | "raw_payload">[] | null;
  leads?: ApprovalLead | ApprovalLead[] | null;
};

type TaskRow = Pick<LeadTask, "id" | "lead_id" | "title" | "description" | "status" | "priority" | "due_at">;
type StageRow = Pick<LeadPipelineStage, "id" | "name" | "slug" | "probability">;

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

function label(value: string) {
  return value.replace(/_/g, " ");
}

export async function getApprovalQueue(orgSlug: string): Promise<ApprovalQueue> {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_message_drafts")
    .select("id, organization_id, conversation_id, message_id, lead_id, draft_content, status, generation_model, generation_context, edited_by_user_id, approved_by_user_id, approved_at, discarded_by_user_id, created_at, updated_at, conversations(id, organization_id, channel_id, lead_id, external_conversation_id, status, assigned_owner_user_id, subject, last_message_at, metadata, created_at, updated_at, channels(display_name, provider, channel_type)), messages(id, body, occurred_at, sender_display_name, raw_payload), leads(id, pipeline_stage_id, full_name, email, phone, identity_confidence, priority, estimated_value, exact_source, source_subtype, original_inbound_channel, source_reference, captured_at, first_contact_at, qualification_status, ai_qualification_decision_path, lead_origin_metadata)")
    .eq("organization_id", tenant.organization.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const draftRows = (data ?? []) as DraftRow[];
  const leadIds = Array.from(new Set(draftRows
    .map((draft) => one(draft.leads)?.id ?? draft.lead_id)
    .filter((value): value is string => Boolean(value))));

  const [{ data: taskData }, { data: stageData }] = await Promise.all([
    leadIds.length > 0
      ? supabase
          .from("lead_tasks")
          .select("id, lead_id, title, description, status, priority, due_at")
          .eq("organization_id", tenant.organization.id)
          .in("lead_id", leadIds)
          .in("status", ["open", "in_progress"])
      : Promise.resolve({ data: [] }),
    supabase
      .from("lead_pipeline_stages")
      .select("id, name, slug, probability")
      .eq("organization_id", tenant.organization.id),
  ]);

  const tasksByLeadId = new Map<string, TaskRow[]>();
  ((taskData ?? []) as TaskRow[]).forEach((task) => {
    if (!task.lead_id) return;
    tasksByLeadId.set(task.lead_id, [...(tasksByLeadId.get(task.lead_id) ?? []), task]);
  });
  const stageById = new Map(((stageData ?? []) as StageRow[]).map((stage) => [stage.id, stage]));

  const items = draftRows.map((draft) => {
    const conversation = one(draft.conversations);
    const channel = one(conversation?.channels);
    const message = one(draft.messages);
    const lead = one(draft.leads);
    const context = record(draft.generation_context);
    const confidenceScore = confidenceFrom(lead?.identity_confidence ?? context.identity_confidence, context);
    const stage = lead?.pipeline_stage_id ? stageById.get(lead.pipeline_stage_id) ?? null : null;
    const leadTasks = lead?.id ? tasksByLeadId.get(lead.id) ?? [] : [];
    const summary = lead
      ? buildLeadQualificationSummary(lead, stage, leadTasks, {
          lastInboundAt: conversation?.last_message_at ?? message?.occurred_at ?? null,
          conversationStatus: conversation?.status ?? null,
          pendingApprovalCount: 1,
          governanceState: "Pending human approval",
          channelLabel: channel?.display_name ?? channel?.provider ?? null,
        })
      : null;
    const missingInformation = summary?.missingFields ?? ["Resolved lead intelligence unavailable"];
    const sourceTrust = summary?.sourceTrust ?? "Source pending";
    const sourceTrustScore = summary?.sourceTrustScore ?? confidenceScore;
    const recommendedAction = summary?.nextBestAction ?? "Review, edit, approve, or discard the draft.";

    return {
      id: draft.id,
      leadId: draft.lead_id,
      leadName: lead?.full_name ?? message?.sender_display_name ?? "Resolved lead",
      propertyReference: propertyReference(draft.leads, draft.messages, context),
      inboundMessage: message?.body ?? "Inbound source message unavailable",
      draftResponse: draft.draft_content,
      confidenceScore: summary?.confidenceScore ?? confidenceScore,
      confidenceLabel: summary ? label(summary.confidence) : "source confidence",
      readinessScore: summary?.readinessScore ?? 0,
      viewingReadiness: summary ? label(summary.viewingReadiness) : "not resolved",
      missingInformation,
      recommendedAction,
      sourceTrust,
      sourceTrustScore,
      memoryContext: memoryContext(draft.leads, draft.conversations, context),
      routingRationale: stringValue(context.routing_rationale)
        ?? "Draft generated from a governed inbound event. Outbound remains locked until certification gates pass.",
      channel: channel?.display_name ?? channel?.provider ?? "Inbound channel",
      status: (summary?.confidenceScore ?? confidenceScore) < 70 ? "hold" : "pending",
      verificationStatus: `Identity ${lead?.identity_confidence ?? "pending"}`,
      governanceState: "Pending human approval",
      limitations: [
        "Outbound transport remains governed; this card does not send messages.",
        missingInformation.length > 0 ? `Missing information: ${missingInformation.join(", ")}` : "No core information gaps detected by deterministic checks.",
        `Source trust: ${sourceTrust} (${sourceTrustScore}%).`,
      ],
      nextAction: recommendedAction,
      conversationId: draft.conversation_id,
      sourceMessageId: draft.message_id,
      draftStatus: draft.status,
      createdAt: draft.created_at,
    } satisfies ApprovalQueueItem;
  });

  return { tenant, items };
}
