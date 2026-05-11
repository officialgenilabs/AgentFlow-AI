import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { displayMember, getOrgMembers } from "@/lib/data/crm";
import type { AiMessageDraft, Channel, Conversation, Lead, Message } from "@/lib/types";

export type ConversationListItem = Conversation & {
  channel?: Pick<Channel, "display_name" | "provider" | "channel_type"> | null;
  lead?: Pick<Lead, "id" | "full_name" | "email" | "phone" | "status" | "assigned_owner_user_id" | "identity_confidence"> | null;
};

export type ConversationThread = {
  tenant: Awaited<ReturnType<typeof resolveTenantBySlug>>;
  conversations: ConversationListItem[];
  selectedConversation: ConversationListItem | null;
  messages: Message[];
  drafts: AiMessageDraft[];
  members: Awaited<ReturnType<typeof getOrgMembers>>;
};

export async function getInbox(orgSlug: string, conversationId?: string): Promise<ConversationThread> {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();

  const [{ data: conversations }, members] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, organization_id, channel_id, lead_id, external_conversation_id, status, assigned_owner_user_id, subject, last_message_at, metadata, created_at, updated_at, channels(display_name, provider, channel_type), leads(id, full_name, email, phone, status, assigned_owner_user_id, identity_confidence)")
      .eq("organization_id", tenant.organization.id)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    getOrgMembers(tenant.organization.id),
  ]);

  const normalizedConversations = ((conversations ?? []).map((conversation) => ({
    ...conversation,
    channel: Array.isArray(conversation.channels) ? conversation.channels[0] : conversation.channels,
    lead: Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads,
  })) as ConversationListItem[]).sort((a, b) => {
    const bActivity = new Date(b.last_message_at ?? b.updated_at ?? b.created_at).getTime();
    const aActivity = new Date(a.last_message_at ?? a.updated_at ?? a.created_at).getTime();
    return bActivity - aActivity;
  });

  const selectedConversation = conversationId
    ? normalizedConversations.find((conversation) => conversation.id === conversationId) ?? null
    : normalizedConversations[0] ?? null;

  if (conversationId && !selectedConversation) {
    redirect(`/app/${orgSlug}/inbox?error=conversation-not-found`);
  }

  const { data: messages } = selectedConversation
    ? await supabase
        .from("messages")
        .select("id, organization_id, channel_id, conversation_id, lead_id, direction, sender_type, sender_external_id, sender_display_name, external_message_id, body, occurred_at, status, sent_at, raw_payload, created_at")
        .eq("organization_id", tenant.organization.id)
        .eq("conversation_id", selectedConversation.id)
        .order("occurred_at", { ascending: false })
    : { data: [] };

  const { data: drafts } = selectedConversation
    ? await supabase
        .from("ai_message_drafts")
        .select("id, organization_id, conversation_id, message_id, lead_id, draft_content, status, generation_model, generation_context, edited_by_user_id, approved_by_user_id, approved_at, discarded_by_user_id, created_at, updated_at")
        .eq("organization_id", tenant.organization.id)
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return {
    tenant,
    conversations: normalizedConversations,
    selectedConversation,
    messages: (messages ?? []) as Message[],
    drafts: (drafts ?? []) as AiMessageDraft[],
    members,
  };
}

export function displayConversationOwner(members: Awaited<ReturnType<typeof getOrgMembers>>, conversation: ConversationListItem | null) {
  if (!conversation) return "Unassigned";
  return displayMember(members, conversation.assigned_owner_user_id ?? conversation.lead?.assigned_owner_user_id ?? null);
}
