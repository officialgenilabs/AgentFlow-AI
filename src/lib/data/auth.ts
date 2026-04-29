import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationBranding, OrganizationMember, Profile, TenantContext } from "@/lib/types";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return { supabase, user: data.user };
}

export async function getCurrentProfile(): Promise<Profile> {
  const { supabase, user } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    redirect("/login?error=profile-required");
  }

  return data as Profile;
}

export async function requirePlatformAdmin() {
  const profile = await getCurrentProfile();
  if (!profile.is_platform_admin) {
    redirect("/select-organization");
  }
  return profile;
}

export async function getUserOrganizations(): Promise<Organization[]> {
  const { supabase } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organizations(id, name, slug, status, industry, plan)")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) return [];

  return (data ?? [])
    .map((row) => row.organizations)
    .filter(Boolean)
    .flat() as Organization[];
}

export async function resolveTenantBySlug(orgSlug: string): Promise<TenantContext> {
  const { supabase } = await getAuthenticatedUser();
  const profile = await getCurrentProfile();

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, status, industry, plan")
    .eq("slug", orgSlug)
    .single();

  if (orgError || !organization) {
    redirect("/select-organization");
  }

  let membership: OrganizationMember | undefined;

  if (!profile.is_platform_admin) {
    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("id, organization_id, user_id, role, status")
      .eq("organization_id", organization.id)
      .eq("user_id", profile.id)
      .eq("status", "active")
      .single();

    if (memberError || !member) {
      redirect("/select-organization?error=tenant-access-denied");
    }

    membership = member as OrganizationMember;
  }

  const { data: branding } = await supabase
    .from("organization_branding")
    .select("organization_id, logo_url, primary_color, secondary_color, accent_color, theme_mode, updated_at")
    .eq("organization_id", organization.id)
    .maybeSingle();

  return {
    profile,
    organization: organization as Organization,
    membership,
    branding: (branding ?? {
      organization_id: organization.id,
      logo_url: null,
      primary_color: "#111827",
      secondary_color: "#f8fafc",
      accent_color: "#c8a96a",
      theme_mode: "light",
      updated_at: new Date().toISOString(),
    }) as OrganizationBranding,
  };
}
