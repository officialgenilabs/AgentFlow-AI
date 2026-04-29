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

export type LeadPipelineStage = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  position: number;
  probability: number;
  is_closed: boolean;
  is_won: boolean;
};

export type Lead = {
  id: string;
  organization_id: string;
  pipeline_stage_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost" | "archived" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  estimated_value: number | null;
  exact_source: string;
  source_subtype: string;
  original_inbound_channel: string;
  source_reference: string | null;
  captured_at: string;
  first_contact_at: string | null;
  qualification_status: "unqualified" | "ai_review_pending" | "ai_qualified" | "human_qualified" | "disqualified" | "nurture" | string;
  ai_qualification_decision_path: unknown[];
  lead_origin_metadata: Record<string, unknown>;
  assigned_owner_user_id: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  lead_pipeline_stages?: Pick<LeadPipelineStage, "name" | "slug" | "probability"> | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type LeadNote = {
  id: string;
  organization_id: string;
  lead_id: string;
  author_user_id: string | null;
  body: string;
  visibility: "internal" | "client_visible" | string;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type LeadEvent = {
  id: string;
  organization_id: string;
  lead_id: string;
  actor_user_id: string | null;
  event_type: string;
  field_name: string | null;
  old_value: unknown;
  new_value: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};

export type LeadTask = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  due_at: string | null;
  assigned_to_user_id: string | null;
  created_by_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  leads?: Pick<Lead, "id" | "full_name" | "status"> | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
};
