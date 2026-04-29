"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";

function safeColor(value: FormDataEntryValue | null, fallback: string) {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
}

export async function updateBranding(orgSlug: string, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();

  if (!tenant.profile.is_platform_admin && !["owner", "admin"].includes(tenant.membership?.role ?? "")) {
    redirect(`/app/${orgSlug}/branding?error=manager-role-required`);
  }

  let logoUrl = tenant.branding.logo_url;
  const file = formData.get("logo");

  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      redirect(`/app/${orgSlug}/branding?error=invalid-logo`);
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${tenant.organization.id}/branding/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) redirect(`/app/${orgSlug}/branding?error=upload-failed`);

    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    logoUrl = data.publicUrl;
  }

  const payload = {
    organization_id: tenant.organization.id,
    logo_url: logoUrl,
    primary_color: safeColor(formData.get("primary_color"), tenant.branding.primary_color),
    secondary_color: safeColor(formData.get("secondary_color"), tenant.branding.secondary_color),
    accent_color: safeColor(formData.get("accent_color"), tenant.branding.accent_color),
    theme_mode: "light",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("organization_branding").upsert(payload, { onConflict: "organization_id" });
  if (error) redirect(`/app/${orgSlug}/branding?error=save-failed`);

  await supabase.from("audit_logs").insert({
    organization_id: tenant.organization.id,
    actor_user_id: tenant.profile.id,
    action: "organization_branding.updated",
    target_type: "organization_branding",
    target_id: tenant.organization.id,
    metadata: { source: "dashboard" },
  });

  revalidatePath(`/app/${orgSlug}`);
  redirect(`/app/${orgSlug}/branding?saved=1`);
}
