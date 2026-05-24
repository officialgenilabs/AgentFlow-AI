"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeDraftStatus(value: FormDataEntryValue | null) {
  const status = text(value);
  return ["draft", "approved", "discarded"].includes(status) ? status : "draft";
}

export async function reviewAiMessageDraft(orgSlug: string, draftId: string, formData: FormData) {
  await resolveTenantBySlug(orgSlug);

  const supabase = await createClient();
  const status = safeDraftStatus(formData.get("status"));
  const draftContent = text(formData.get("draft_content"));

  if (!draftContent && status !== "discarded") {
    redirect(`/app/${orgSlug}/approvals?error=draft-content-required`);
  }

  const { error } = await supabase.rpc("review_ai_message_draft", {
    p_draft_id: draftId,
    p_status: status,
    p_draft_content: status === "discarded" ? "Discarded draft" : draftContent,
  });

  if (error) {
    redirect(`/app/${orgSlug}/approvals?error=draft-review-failed`);
  }

  revalidatePath(`/app/${orgSlug}/approvals`);
  revalidatePath(`/app/${orgSlug}/inbox`);
  redirect(`/app/${orgSlug}/approvals?draft=${status}`);
}
