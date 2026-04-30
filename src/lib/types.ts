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
  normalized_email: string | null;
  normalized_phone_e164: string | null;
  identity_confidence: "none" | "email" | "phone" | "phone_email" | string;
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

export type Channel = {
  id: string;
  organization_id: string;
  provider: string;
  channel_type: string;
  display_name: string;
  external_channel_id: string | null;
  inbound_identifier: string | null;
  status: "active" | "paused" | "disabled" | string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  organization_id: string;
  channel_id: string;
  lead_id: string | null;
  external_conversation_id: string | null;
  status: "open" | "handoff" | "closed" | string;
  assigned_owner_user_id: string | null;
  subject: string | null;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  organization_id: string;
  channel_id: string;
  conversation_id: string;
  lead_id: string | null;
  direction: "inbound" | "outbound" | "internal" | "system" | string;
  sender_type: "lead" | "agent" | "system" | string;
  sender_external_id: string | null;
  sender_display_name: string | null;
  external_message_id: string | null;
  body: string;
  occurred_at: string;
  raw_payload: Record<string, unknown>;
  created_at: string;
};

export type AutomationEvent = {
  id: string;
  organization_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  lead_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "processed" | "failed" | "ignored" | string;
  created_at: string;
  processed_at: string | null;
};
