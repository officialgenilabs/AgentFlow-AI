import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { displayMember, getOrgMembers } from "@/lib/data/crm";
import type { AiMessageDraft, Channel, Conversation, Lead, LeadPipelineStage, LeadTask, Message } from "@/lib/types";
import { isDemoMode } from "@/lib/demo/config";
import { demoConversations, demoLeads, demoMessages, demoPipelineStages, demoTasks } from "@/lib/demo/data";

type InboxLead = Pick<
  Lead,
  | "id"
  | "pipeline_stage_id"
  | "full_name"
  | "email"
  | "phone"
  | "identity_confidence"
  | "status"
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
  | "assigned_owner_user_id"
>;

export type ConversationListItem = Conversation & {
  channel?: Pick<Channel, "display_name" | "provider" | "channel_type"> | null;
  lead?: InboxLead | null;
};

export type ConversationThread = {
  tenant: Awaited<ReturnType<typeof resolveTenantBySlug>>;
  conversations: ConversationListItem[];
  selectedConversation: ConversationListItem | null;
  selectedLeadStage: Pick<LeadPipelineStage, "id" | "name" | "slug" | "probability"> | null;
  selectedLeadTasks: Pick<LeadTask, "id" | "lead_id" | "title" | "description" | "status" | "priority" | "due_at">[];
  messages: Message[];
  drafts: AiMessageDraft[];
  members: Awaited<ReturnType<typeof getOrgMembers>>;
};

export async function getInbox(orgSlug: string, conversationId?: string, forceDemo?: boolean): Promise<ConversationThread> {
  if (forceDemo || isDemoMode()) {
    const tenant = await resolveTenantBySlug(orgSlug, true);
    const members = await getOrgMembers(tenant.organization.id, true);

    const normalizedConversations = demoConversations.map((conversation) => {
      const lead = demoLeads.find((l) => l.id === conversation.lead_id);
      return {
        ...conversation,
        channel: { display_name: "WhatsApp Sandbox", provider: "twilio", channel_type: "whatsapp" },
        lead: lead ? lead as InboxLead : null,
      };
    }) as ConversationListItem[];

    const selectedConversation = conversationId
      ? normalizedConversations.find((conversation) => conversation.id === conversationId) ?? null
      : normalizedConversations[0] ?? null;

    if (conversationId && !selectedConversation) {
      redirect(`/app/${orgSlug}/inbox?error=conversation-not-found`);
    }

    const messages = selectedConversation
      ? demoMessages.filter((m) => m.conversation_id === selectedConversation.id)
      : [];
    const selectedLeadStage = selectedConversation?.lead?.pipeline_stage_id
      ? demoPipelineStages.find((stage) => stage.id === selectedConversation.lead?.pipeline_stage_id) ?? null
      : null;
    const selectedLeadTasks = selectedConversation?.lead?.id
      ? demoTasks.filter((task) => task.lead_id === selectedConversation.lead?.id)
      : [];

    return {
      tenant,
      conversations: normalizedConversations,
      selectedConversation,
      selectedLeadStage,
      selectedLeadTasks,
      messages,
      drafts: [],
      members,
    };
  }

  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();

  const [{ data: conversations }, members] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, organization_id, channel_id, lead_id, external_conversation_id, status, assigned_owner_user_id, subject, last_message_at, metadata, created_at, updated_at, channels(display_name, provider, channel_type), leads(id, pipeline_stage_id, full_name, email, phone, identity_confidence, status, priority, estimated_value, exact_source, source_subtype, original_inbound_channel, source_reference, captured_at, first_contact_at, qualification_status, ai_qualification_decision_path, lead_origin_metadata, assigned_owner_user_id)")
      .eq("organization_id", tenant.organization.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    getOrgMembers(tenant.organization.id),
  ]);

  const normalizedConversations = (conversations ?? []).map((conversation) => ({
    ...conversation,
    channel: Array.isArray(conversation.channels) ? conversation.channels[0] : conversation.channels,
    lead: Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads,
  })) as ConversationListItem[];

  const selectedConversation = conversationId
    ? normalizedConversations.find((conversation) => conversation.id === conversationId) ?? null
    : normalizedConversations[0] ?? null;

  if (conversationId && !selectedConversation) {
    redirect(`/app/${orgSlug}/inbox?error=conversation-not-found`);
  }

  const selectedLeadId = selectedConversation?.lead?.id ?? selectedConversation?.lead_id ?? null;
  const selectedStageId = selectedConversation?.lead?.pipeline_stage_id ?? null;

  const [
    { data: messages },
    { data: drafts },
    { data: selectedLeadTasks },
    { data: selectedLeadStage },
  ] = await Promise.all([
    selectedConversation
      ? supabase
          .from("messages")
          .select("id, organization_id, channel_id, conversation_id, lead_id, direction, sender_type, sender_external_id, sender_display_name, external_message_id, body, occurred_at, status, sent_at, raw_payload, created_at")
          .eq("organization_id", tenant.organization.id)
          .eq("conversation_id", selectedConversation.id)
          .order("occurred_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    selectedConversation
      ? supabase
          .from("ai_message_drafts")
          .select("id, organization_id, conversation_id, message_id, lead_id, draft_content, status, generation_model, generation_context, edited_by_user_id, approved_by_user_id, approved_at, discarded_by_user_id, created_at, updated_at")
          .eq("organization_id", tenant.organization.id)
          .eq("conversation_id", selectedConversation.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    selectedLeadId
      ? supabase
          .from("lead_tasks")
          .select("id, lead_id, title, description, status, priority, due_at")
          .eq("organization_id", tenant.organization.id)
          .eq("lead_id", selectedLeadId)
          .order("due_at", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] }),
    selectedStageId
      ? supabase
          .from("lead_pipeline_stages")
          .select("id, name, slug, probability")
          .eq("organization_id", tenant.organization.id)
          .eq("id", selectedStageId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return {
    tenant,
    conversations: normalizedConversations,
    selectedConversation,
    selectedLeadStage: selectedLeadStage as Pick<LeadPipelineStage, "id" | "name" | "slug" | "probability"> | null,
    selectedLeadTasks: (selectedLeadTasks ?? []) as Pick<LeadTask, "id" | "lead_id" | "title" | "description" | "status" | "priority" | "due_at">[],
    messages: (messages ?? []) as Message[],
    drafts: (drafts ?? []) as AiMessageDraft[],
    members,
  };
}

export function displayConversationOwner(members: Awaited<ReturnType<typeof getOrgMembers>>, conversation: ConversationListItem | null) {
  if (!conversation) return "Unassigned";
  return displayMember(members, conversation.assigned_owner_user_id ?? conversation.lead?.assigned_owner_user_id ?? null);
}
