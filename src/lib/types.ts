export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_platform_admin: boolean;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: "setup" | "active" | "paused" | "cancelled" | string;
  industry: string;
  plan: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | string;
  status: "active" | "invited" | "disabled" | string;
};

export type OrganizationBranding = {
  organization_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme_mode: "light" | "dark" | "system" | string;
  updated_at: string;
};

export type TenantContext = {
  profile: Profile;
  organization: Organization;
  membership?: OrganizationMember;
  branding: OrganizationBranding;
};
