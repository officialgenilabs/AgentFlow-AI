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
  const status = text(value);
  return ["draft", "approved", "discarded"].includes(status) ? status : "draft";
}

function outboundTransportEnabled() {
  return process.env.OUTBOUND_TRANSPORT_ENABLED === "true";
}

function outboundExecutionSecret() {
  return process.env.GOVERNED_OUTBOUND_EXECUTION_SECRET || process.env.OUTBOUND_EXECUTION_SECRET || "";
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

export async function reviewAiMessageDraft(orgSlug: string, draftId: string, formData: FormData) {
  await resolveTenantBySlug(orgSlug);

  const supabase = await createClient();
  const status = safeDraftStatus(formData.get("status"));
  const draftContent = text(formData.get("draft_content"));
  const shouldSend = status === "approved" && outboundTransportEnabled();
  const executionSecret = outboundExecutionSecret();

  if (!draftContent && status !== "discarded") {
    redirect(`/app/${orgSlug}/approvals?error=draft-content-required`);
  }

  if (shouldSend && !executionSecret) {
    redirect(`/app/${orgSlug}/approvals?error=outbound-execution-secret-missing`);
  }

  const { error: reviewError } = await supabase.rpc("review_ai_message_draft", {
    p_draft_id: draftId,
    p_status: status,
    p_draft_content: status === "discarded" ? "Discarded draft" : draftContent,
    p_outbound_frozen: !shouldSend,
  });

  if (reviewError) {
    redirect(`/app/${orgSlug}/approvals?error=draft-review-failed`);
  }

  if (!shouldSend) {
    revalidatePath(`/app/${orgSlug}/approvals`);
    revalidatePath(`/app/${orgSlug}/inbox`);
    redirect(`/app/${orgSlug}/approvals?draft=${status}`);
  }

  const { data: preparedData, error: prepareError } = await supabase.rpc("send_outbound_message", {
    p_draft_id: draftId,
    p_action: "prepare",
    p_execution_secret: executionSecret,
  });
  const prepared = firstRpcRow(preparedData);

  if (prepareError || !prepared?.can_send) {
    redirect(`/app/${orgSlug}/approvals?error=send-prepare-failed`);
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
      p_execution_secret: executionSecret,
    });

    revalidatePath(`/app/${orgSlug}/approvals`);
    revalidatePath(`/app/${orgSlug}/inbox`);
    redirect(`/app/${orgSlug}/approvals?error=send-failed-manual-retry`);
  }

  const { error: finalizeError } = await supabase.rpc("send_outbound_message", {
    p_draft_id: draftId,
    p_action: "finalize",
    p_delivery_status: "sent",
    p_external_message_id: delivery.externalMessageId,
    p_delivery_response: delivery.response,
    p_execution_secret: executionSecret,
  });

  if (finalizeError) redirect(`/app/${orgSlug}/approvals?error=send-finalize-failed`);

  revalidatePath(`/app/${orgSlug}/approvals`);
  revalidatePath(`/app/${orgSlug}/inbox`);
  redirect(`/app/${orgSlug}/approvals?sent=1`);
}
