"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { sendEvolutionTextMessage } from "@/lib/evolution";
import { createClient } from "@/lib/supabase/server";

type SendOutboundResult = {
  organization_id: string;
  channel_id: string;
  conversation_id: string;
  message_id: string;
  lead_id: string | null;
  draft_id: string;
  message_body: string;
  recipient_identifier: string;
  recipient_phone: string;
  evolution_instance: string | null;
  message_status: "pending" | "sent" | "failed" | string;
  can_send: boolean;
  audit_event_id: string | null;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeDraftStatus(value: FormDataEntryValue | null) {
  const next = text(value);
  return ["draft", "approved", "discarded"].includes(next) ? next : "draft";
}

function firstRpcRow(value: unknown): SendOutboundResult | null {
  if (Array.isArray(value)) return (value[0] as SendOutboundResult | undefined) ?? null;
  return (value as SendOutboundResult | null) ?? null;
}

function sanitizeDeliveryError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 240);
  return "evolution_send_failed";
}

function deliveryResponseFromError(error: unknown): Record<string, unknown> {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: unknown }).response;
    if (response && typeof response === "object" && !Array.isArray(response)) return response as Record<string, unknown>;
  }
  return { error: sanitizeDeliveryError(error) };
}

export async function updateAiMessageDraft(orgSlug: string, draftId: string, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const draftContent = text(formData.get("draft_content"));
  const status = safeDraftStatus(formData.get("status"));
  const conversationId = text(formData.get("conversation_id"));

  if (!draftContent && status !== "discarded") {
    redirect(`/app/${orgSlug}/inbox?conversationId=${conversationId}&error=draft-content-required`);
  }

  const patch: Record<string, string | null> = {
    status,
    draft_content: draftContent || "Discarded draft",
    edited_by_user_id: tenant.profile.id,
    approved_by_user_id: status === "approved" ? tenant.profile.id : null,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    discarded_by_user_id: status === "discarded" ? tenant.profile.id : null,
  };

  const { error } = await supabase
    .from("ai_message_drafts")
    .update(patch)
    .eq("id", draftId)
    .eq("organization_id", tenant.organization.id);

  if (error) redirect(`/app/${orgSlug}/inbox?conversationId=${conversationId}&error=draft-update-failed`);

  revalidatePath(`/app/${orgSlug}/inbox`);
  redirect(`/app/${orgSlug}/inbox?conversationId=${conversationId}&draft=${status}`);
}

export async function sendApprovedAiMessageDraft(orgSlug: string, draftId: string, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const draftContent = text(formData.get("draft_content"));
  const conversationId = text(formData.get("conversation_id"));

  const approvalPatch: Record<string, string | null> = {
    status: "approved",
    approved_by_user_id: tenant.profile.id,
    approved_at: new Date().toISOString(),
    discarded_by_user_id: null,
  };

  if (draftContent) {
    approvalPatch.draft_content = draftContent;
    approvalPatch.edited_by_user_id = tenant.profile.id;
  }

  const { error: approveError } = await supabase
    .from("ai_message_drafts")
    .update(approvalPatch)
    .eq("id", draftId)
    .eq("organization_id", tenant.organization.id)
    .neq("status", "discarded")
    .select("id")
    .single();

  if (approveError) redirect(`/app/${orgSlug}/inbox?conversationId=${conversationId}&error=draft-approval-failed`);

  const { data: preparedData, error: prepareError } = await supabase.rpc("send_outbound_message", {
    p_draft_id: draftId,
    p_action: "prepare",
  });
  const prepared = firstRpcRow(preparedData);

  if (prepareError || !prepared?.can_send) {
    redirect(`/app/${orgSlug}/inbox?conversationId=${conversationId}&error=send-prepare-failed`);
  }

  let delivery: Awaited<ReturnType<typeof sendEvolutionTextMessage>>;
  try {
    delivery = await sendEvolutionTextMessage({
      instance: prepared.evolution_instance,
      number: prepared.recipient_phone,
      text: prepared.message_body,
    });
  } catch (error) {
    await supabase.rpc("send_outbound_message", {
      p_draft_id: draftId,
      p_action: "finalize",
      p_delivery_status: "failed",
      p_delivery_response: deliveryResponseFromError(error),
      p_delivery_error: sanitizeDeliveryError(error),
    });

    revalidatePath(`/app/${orgSlug}/inbox`);
    redirect(`/app/${orgSlug}/inbox?conversationId=${prepared.conversation_id}&error=send-failed-manual-retry`);
  }

  const { error: finalizeError } = await supabase.rpc("send_outbound_message", {
    p_draft_id: draftId,
    p_action: "finalize",
    p_delivery_status: "sent",
    p_external_message_id: delivery.externalMessageId,
    p_delivery_response: delivery.response,
  });

  if (finalizeError) redirect(`/app/${orgSlug}/inbox?conversationId=${prepared.conversation_id}&error=send-finalize-failed`);

  revalidatePath(`/app/${orgSlug}/inbox`);
  redirect(`/app/${orgSlug}/inbox?conversationId=${prepared.conversation_id}&sent=1`);
}
