import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { displayMember, getOrgMembers } from "@/lib/data/crm";
import type { Channel, Conversation, Lead, Message } from "@/lib/types";
import { isDemoMode } from "@/lib/demo/config";
import { demoConversations, demoLeads, demoMessages } from "@/lib/demo/data";

export type ConversationListItem = Conversation & {
  channel?: Pick<Channel, "display_name" | "provider" | "channel_type"> | null;
  lead?: Pick<Lead, "id" | "full_name" | "email" | "phone" | "status" | "assigned_owner_user_id" | "identity_confidence"> | null;
};

export type ConversationThread = {
  tenant: Awaited<ReturnType<typeof resolveTenantBySlug>>;
  conversations: ConversationListItem[];
  selectedConversation: ConversationListItem | null;
  messages: Message[];
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
        lead: lead ? {
          id: lead.id,
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          assigned_owner_user_id: lead.assigned_owner_user_id,
          identity_confidence: lead.identity_confidence,
        } : null,
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

    return {
      tenant,
      conversations: normalizedConversations,
      selectedConversation,
      messages,
      members,
    };
  }

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

  const { data: messages } = selectedConversation
    ? await supabase
        .from("messages")
        .select("id, organization_id, channel_id, conversation_id, lead_id, direction, sender_type, sender_external_id, sender_display_name, external_message_id, body, occurred_at, raw_payload, created_at")
        .eq("organization_id", tenant.organization.id)
        .eq("conversation_id", selectedConversation.id)
        .order("occurred_at", { ascending: true })
    : { data: [] };

  return {
    tenant,
    conversations: normalizedConversations,
    selectedConversation,
    messages: (messages ?? []) as Message[],
    members,
  };
}

export function displayConversationOwner(members: Awaited<ReturnType<typeof getOrgMembers>>, conversation: ConversationListItem | null) {
  if (!conversation) return "Unassigned";
  return displayMember(members, conversation.assigned_owner_user_id ?? conversation.lead?.assigned_owner_user_id ?? null);
}
