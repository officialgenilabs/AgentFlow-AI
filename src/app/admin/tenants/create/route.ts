import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/slug";

function safeColor(value: FormDataEntryValue | null, fallback: string) {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : fallback;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_platform_admin")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.is_platform_admin) redirect("/select-organization?error=platform-admin-required");

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const slug = toSlug(requestedSlug || name);

  if (!name || !slug) redirect("/admin/tenants/new?error=invalid-tenant");

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, slug, status: "active", industry: "real_estate", plan: "starter" })
    .select("id, slug")
    .single();

  if (orgError || !organization) redirect("/admin/tenants/new?error=create-failed");

  await supabase.from("organization_branding").insert({
    organization_id: organization.id,
    primary_color: safeColor(formData.get("primary_color"), "#111827"),
    secondary_color: safeColor(formData.get("secondary_color"), "#f8fafc"),
    accent_color: safeColor(formData.get("accent_color"), "#c8a96a"),
  });

  await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: profile.id,
    action: "organization.created",
    target_type: "organization",
    target_id: organization.id,
    metadata: { source: "founder_admin" },
  });

  redirect(`/admin/tenants?created=${organization.slug}`);
}
