"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeDraftStatus(value: FormDataEntryValue | null) {
  const next = text(value);
  return ["draft", "approved", "discarded"].includes(next) ? next : "draft";
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

export async function sendApprovedAiMessageDraft(orgSlug: string, _draftId: string, formData: FormData) {
  const conversationId = text(formData.get("conversation_id"));

  redirect(`/app/${orgSlug}/inbox?conversationId=${conversationId}&error=outbound-governance-locked`);
}
