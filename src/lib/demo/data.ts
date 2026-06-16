import type {
  Profile,
  Organization,
  OrganizationBranding,
  Lead,
  Conversation,
  Message,
  LeadTask,
  LeadEvent,
  LeadNote,
  LeadPipelineStage
} from "@/lib/types";

// Core context
export const demoProfile: Profile = {
  id: "demo-operator-id",
  full_name: "Lead Architect",
  email: "operator@genilabs.ai",
  avatar_url: null,
  is_platform_admin: true
};

export const demoOrganization: Organization = {
  id: "demo-org-id",
  name: "Boutique Properties",
  slug: "boutique-properties",
  status: "active",
  industry: "Real Estate",
  plan: "Enterprise Staging"
};

export const demoBranding: OrganizationBranding = {
  organization_id: "demo-org-id",
  logo_url: "/logo.svg",
  primary_color: "#00E599",
  secondary_color: "#6C63FF",
  accent_color: "#00E599",
  theme_mode: "dark",
  updated_at: new Date().toISOString()
};

// Pipeline Stages
export const demoPipelineStages: LeadPipelineStage[] = [
  { id: "stage-capture", organization_id: "demo-org-id", name: "Capture", slug: "capture", position: 1, probability: 10, is_closed: false, is_won: false },
  { id: "stage-qualify", organization_id: "demo-org-id", name: "Qualify", slug: "qualify", position: 2, probability: 30, is_closed: false, is_won: false },
  { id: "stage-route", organization_id: "demo-org-id", name: "Route", slug: "route", position: 3, probability: 50, is_closed: false, is_won: false },
  { id: "stage-govern", organization_id: "demo-org-id", name: "Govern", slug: "govern", position: 4, probability: 75, is_closed: false, is_won: false },
  { id: "stage-schedule", organization_id: "demo-org-id", name: "Schedule", slug: "schedule", position: 5, probability: 90, is_closed: false, is_won: false },
  { id: "stage-won", organization_id: "demo-org-id", name: "Won", slug: "won", position: 6, probability: 100, is_closed: true, is_won: true }
];

// Leads data
export const demoLeads: Lead[] = [
  {
    id: "lead-sibusiso",
    organization_id: "demo-org-id",
    pipeline_stage_id: "stage-capture",
    full_name: "Sibusiso Ndlovu",
    email: "sibusiso@ndlovuholdings.co.za",
    phone: "+27 82 555 0192",
    normalized_email: "sibusiso@ndlovuholdings.co.za",
    normalized_phone_e164: "+27825550192",
    identity_confidence: "phone_email",
    company: "Ndlovu Holdings",
    status: "new",
    priority: "high",
    estimated_value: 4200000,
    exact_source: "Property24",
    source_subtype: "Premium Listing",
    original_inbound_channel: "WhatsApp",
    source_reference: "P24-8840294",
    captured_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4h ago
    first_contact_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    qualification_status: "ai_review_pending",
    ai_qualification_decision_path: [],
    lead_origin_metadata: { property: "Sandton Penthouse // 3 Bed, 3 Bath", price: "R4,200,000" },
    assigned_owner_user_id: "demo-operator-id",
    created_by_user_id: null,
    updated_by_user_id: null,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    lead_pipeline_stages: { name: "Capture", slug: "capture", probability: 10 }
  },
  {
    id: "lead-jessica",
    organization_id: "demo-org-id",
    pipeline_stage_id: "stage-qualify",
    full_name: "Jessica Vandermerwe",
    email: "jess.vdmerwe@icloud.com",
    phone: "+27 71 445 8891",
    normalized_email: "jess.vdmerwe@icloud.com",
    normalized_phone_e164: "+27714458891",
    identity_confidence: "phone_email",
    company: null,
    status: "contacted",
    priority: "urgent",
    estimated_value: 18500000,
    exact_source: "Meta Ads",
    source_subtype: "Camps Bay Luxury",
    original_inbound_channel: "WhatsApp",
    source_reference: "FB-AD-CAMPBAY",
    captured_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), // 1 day ago
    first_contact_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    qualification_status: "ai_qualified",
    ai_qualification_decision_path: [],
    lead_origin_metadata: { property: "Camps Bay Beachfront Villa // 5 Bed", price: "R18,500,000" },
    assigned_owner_user_id: "demo-operator-id",
    created_by_user_id: null,
    updated_by_user_id: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    lead_pipeline_stages: { name: "Qualify", slug: "qualify", probability: 30 }
  },
  {
    id: "lead-david",
    organization_id: "demo-org-id",
    pipeline_stage_id: "stage-route",
    full_name: "David Pieterse",
    email: "david@pieterse-law.co.za",
    phone: "+27 83 232 4040",
    normalized_email: "david@pieterse-law.co.za",
    normalized_phone_e164: "+27832324040",
    identity_confidence: "phone_email",
    company: "Pieterse & Associates",
    status: "qualified",
    priority: "medium",
    estimated_value: 8900000,
    exact_source: "Website Form",
    source_subtype: "Contact Request",
    original_inbound_channel: "Email",
    source_reference: null,
    captured_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    first_contact_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    qualification_status: "human_qualified",
    ai_qualification_decision_path: [],
    lead_origin_metadata: { property: "Stellenbosch Estate Villa // 4 Bed", price: "R8,900,000" },
    assigned_owner_user_id: "demo-operator-id",
    created_by_user_id: null,
    updated_by_user_id: null,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    lead_pipeline_stages: { name: "Route", slug: "route", probability: 50 }
  },
  {
    id: "lead-sarah",
    organization_id: "demo-org-id",
    pipeline_stage_id: "stage-govern",
    full_name: "Sarah Jenkins",
    email: "sarah.j@globalconsulting.com",
    phone: "+27 60 789 2201",
    normalized_email: "sarah.j@globalconsulting.com",
    normalized_phone_e164: "+27607892201",
    identity_confidence: "phone_email",
    company: "Global Consulting Group",
    status: "new",
    priority: "high",
    estimated_value: 12000000,
    exact_source: "Property24",
    source_subtype: "Clifton Listing",
    original_inbound_channel: "WhatsApp",
    source_reference: "P24-998820",
    captured_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    first_contact_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    qualification_status: "ai_review_pending",
    ai_qualification_decision_path: [],
    lead_origin_metadata: { property: "Clifton Cliffside Apartment // 2 Bed", price: "R12,000,000" },
    assigned_owner_user_id: null,
    created_by_user_id: null,
    updated_by_user_id: null,
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    lead_pipeline_stages: { name: "Govern", slug: "govern", probability: 75 }
  },
  {
    id: "lead-thabo",
    organization_id: "demo-org-id",
    pipeline_stage_id: "stage-schedule",
    full_name: "Thabo Molefe",
    email: "thabo.molefe@netactive.co.za",
    phone: "+27 82 991 3840",
    normalized_email: "thabo.molefe@netactive.co.za",
    normalized_phone_e164: "+27829913840",
    identity_confidence: "phone",
    company: null,
    status: "qualified",
    priority: "medium",
    estimated_value: 6500000,
    exact_source: "Property24",
    source_subtype: "Waterfall Estate Listing",
    original_inbound_channel: "WhatsApp",
    source_reference: "P24-776210",
    captured_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    first_contact_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    qualification_status: "human_qualified",
    ai_qualification_decision_path: [],
    lead_origin_metadata: { property: "Waterfall Country Estate Modern House", price: "R6,500,000" },
    assigned_owner_user_id: "demo-operator-id",
    created_by_user_id: null,
    updated_by_user_id: null,
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    lead_pipeline_stages: { name: "Schedule", slug: "schedule", probability: 90 }
  }
];

// Conversations
export const demoConversations: Conversation[] = [
  {
    id: "conv-sibusiso",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    lead_id: "lead-sibusiso",
    external_conversation_id: "whatsapp-sibusiso",
    status: "open",
    assigned_owner_user_id: "demo-operator-id",
    subject: "WhatsApp Chat: Sibusiso Ndlovu",
    last_message_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15m ago
    metadata: { property_reference: "Sandton Penthouse" },
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: "conv-jessica",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    lead_id: "lead-jessica",
    external_conversation_id: "whatsapp-jessica",
    status: "handoff",
    assigned_owner_user_id: "demo-operator-id",
    subject: "WhatsApp Chat: Jessica Vandermerwe",
    last_message_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    metadata: { property_reference: "Camps Bay Beachfront Villa" },
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: "conv-sarah",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    lead_id: "lead-sarah",
    external_conversation_id: "whatsapp-sarah",
    status: "open",
    assigned_owner_user_id: null,
    subject: "WhatsApp Chat: Sarah Jenkins",
    last_message_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    metadata: { property_reference: "Clifton Apartment" },
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  }
];

// Messages
export const demoMessages: Message[] = [
  // Sibusiso Ndlovu chat history
  {
    id: "msg-sib-1",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    conversation_id: "conv-sibusiso",
    lead_id: "lead-sibusiso",
    direction: "inbound",
    sender_type: "lead",
    sender_external_id: "whatsapp-+27825550192",
    sender_display_name: "Sibusiso Ndlovu",
    external_message_id: "wa-1",
    body: "Hi there, I saw the Sandton Penthouse listing on Property24. Is it still available for viewings?",
    occurred_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    raw_payload: {},
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
  },
  {
    id: "msg-sib-2",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    conversation_id: "conv-sibusiso",
    lead_id: "lead-sibusiso",
    direction: "system",
    sender_type: "system",
    sender_external_id: null,
    sender_display_name: "Lead Engine",
    external_message_id: "system-1",
    body: "Lead ingested from Property24. Source matched: Whatsapp. Context: Sandton Penthouse (R4.2M). Identity confidence: Phone verified (99%).",
    occurred_at: new Date(Date.now() - 4 * 3600 * 1000 + 5000).toISOString(),
    raw_payload: {},
    created_at: new Date(Date.now() - 4 * 3600 * 1000 + 5000).toISOString()
  },
  {
    id: "msg-sib-3",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    conversation_id: "conv-sibusiso",
    lead_id: "lead-sibusiso",
    direction: "inbound",
    sender_type: "lead",
    sender_external_id: "whatsapp-+27825550192",
    sender_display_name: "Sibusiso Ndlovu",
    external_message_id: "wa-2",
    body: "Particularly interested in seeing it this Saturday if possible. I would also like to verify if it has backup solar system. Power grid has been unstable in that section.",
    occurred_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    raw_payload: {},
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },

  // Jessica chat history
  {
    id: "msg-jes-1",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    conversation_id: "conv-jessica",
    lead_id: "lead-jessica",
    direction: "inbound",
    sender_type: "lead",
    sender_external_id: "whatsapp-+27714458891",
    sender_display_name: "Jessica Vandermerwe",
    external_message_id: "wa-j-1",
    body: "Hi, requesting details on the Camps Bay beachfront property shown in Facebook Ads.",
    occurred_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    raw_payload: {},
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: "msg-jes-2",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    conversation_id: "conv-jessica",
    lead_id: "lead-jessica",
    direction: "outbound",
    sender_type: "system",
    sender_external_id: null,
    sender_display_name: "AgentFlow AI",
    external_message_id: "wa-j-2",
    body: "Hello Jessica! Yes, that stunning 5-bedroom beachfront villa is still available. It has direct beach access, a private heated infinity pool, and complete off-grid power solutions (solar + backup battery). Would you like to review the brochure or schedule a private viewing?",
    occurred_at: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 2 * 60 * 1000).toISOString(),
    raw_payload: {},
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 2 * 60 * 1000).toISOString()
  },
  {
    id: "msg-jes-3",
    organization_id: "demo-org-id",
    channel_id: "channel-whatsapp",
    conversation_id: "conv-jessica",
    lead_id: "lead-jessica",
    direction: "inbound",
    sender_type: "lead",
    sender_external_id: "whatsapp-+27714458891",
    sender_display_name: "Jessica Vandermerwe",
    external_message_id: "wa-j-3",
    body: "Brochure looks excellent. I want to schedule a viewing for Sunday afternoon around 3:00 PM. I am currently in Johannesburg but flying in to Cape Town this weekend. Please confirm if that slot works.",
    occurred_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    raw_payload: {},
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  }
];

// Tasks
export const demoTasks: LeadTask[] = [
  {
    id: "task-1",
    organization_id: "demo-org-id",
    lead_id: "lead-sibusiso",
    title: "Verify Backup Solar Details",
    description: "Verify solar system battery storage capacity for Sandton Penthouse to confirm load-shedding tolerance.",
    status: "open",
    priority: "high",
    due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    assigned_to_user_id: "demo-operator-id",
    created_by_user_id: "demo-operator-id",
    completed_at: null,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    leads: { id: "lead-sibusiso", full_name: "Sibusiso Ndlovu", status: "new" }
  },
  {
    id: "task-2",
    organization_id: "demo-org-id",
    lead_id: "lead-jessica",
    title: "Prepare Camps Bay Villa Access",
    description: "Coordinate with Camps Bay on-site management team to ensure estate gates and biometric locks are pre-configured for visitor access.",
    status: "in_progress",
    priority: "urgent",
    due_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    assigned_to_user_id: "demo-operator-id",
    created_by_user_id: "demo-operator-id",
    completed_at: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    leads: { id: "lead-jessica", full_name: "Jessica Vandermerwe", status: "contacted" }
  }
];

// Lead Events & Timeline Details
export const demoTimelineEvents: Record<string, LeadEvent[]> = {
  "lead-sibusiso": [
    {
      id: "ev-sib-1",
      organization_id: "demo-org-id",
      lead_id: "lead-sibusiso",
      actor_user_id: null,
      event_type: "capture",
      field_name: "lead",
      old_value: null,
      new_value: "captured",
      metadata: { source: "Property24 API Integration", original_channel: "WhatsApp Ingress Node" },
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    },
    {
      id: "ev-sib-2",
      organization_id: "demo-org-id",
      lead_id: "lead-sibusiso",
      actor_user_id: null,
      event_type: "identity_resolve",
      field_name: "identity_confidence",
      old_value: "none",
      new_value: "phone_email",
      metadata: { match_rate: 0.99, system: "Gen I Labs Identity Engine", matches: ["Email Match", "WhatsApp Profile Match"] },
      created_at: new Date(Date.now() - 4 * 3600 * 1000 + 1000).toISOString()
    },
    {
      id: "ev-sib-3",
      organization_id: "demo-org-id",
      lead_id: "lead-sibusiso",
      actor_user_id: null,
      event_type: "qualification_check",
      field_name: "qualification_status",
      old_value: "unqualified",
      new_value: "ai_review_pending",
      metadata: { reasoning: "Inbound inquiry captures explicit property intent (Sandton Penthouse) and scheduled viewing request. High buying indicators detected." },
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    {
      id: "ev-sib-4",
      organization_id: "demo-org-id",
      lead_id: "lead-sibusiso",
      actor_user_id: null,
      event_type: "solar_concern_flagged",
      field_name: "outbound_hold",
      old_value: null,
      new_value: "solar_discrepancy_check",
      metadata: { reasoning: "Inbound inquiry mentions power grid instability / solar request. Sandton Penthouse verified battery inventory must be cross-referenced." },
      created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString()
    },
    {
      id: "ev-sib-5",
      organization_id: "demo-org-id",
      lead_id: "lead-sibusiso",
      actor_user_id: "demo-operator-id",
      event_type: "operator_task_created",
      field_name: "task",
      old_value: null,
      new_value: "Verify Backup Solar Details",
      metadata: { assigned_to: "Lead Architect", status: "open" },
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    },
    {
      id: "ev-sib-6",
      organization_id: "demo-org-id",
      lead_id: "lead-sibusiso",
      actor_user_id: null,
      event_type: "ai_draft_generated",
      field_name: "draft_response",
      old_value: null,
      new_value: "Hi Sibusiso! ...",
      metadata: { confidence: "94%", matching: "saturday_opening, solar_backup" },
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString()
    },
    {
      id: "ev-sib-7",
      organization_id: "demo-org-id",
      lead_id: "lead-sibusiso",
      actor_user_id: "demo-operator-id",
      event_type: "governance_hold",
      field_name: "compliance_gate",
      old_value: null,
      new_value: "Mandatory Human-in-the-Loop",
      metadata: { reasoning: "Sandton high-value premium listing requires operator confirmation before outbound dispatch." },
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    }
  ],
  "lead-jessica": [
    {
      id: "ev-jes-1",
      organization_id: "demo-org-id",
      lead_id: "lead-jessica",
      actor_user_id: null,
      event_type: "capture",
      field_name: "lead",
      old_value: null,
      new_value: "captured",
      metadata: { source: "Meta Conversational API", campaign: "Cape Town Luxury Beachfront" },
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "ev-jes-2",
      organization_id: "demo-org-id",
      lead_id: "lead-jessica",
      actor_user_id: "demo-operator-id",
      event_type: "qualification_check",
      field_name: "qualification_status",
      old_value: "ai_review_pending",
      new_value: "ai_qualified",
      metadata: { confidence: 0.96, match_indicators: ["brochure_viewed", "flight_details_provided", "explicit_time_Sunday_3pm"] },
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    }
  ]
};

// AI Approval Queue
export interface AIApprovalItem {
  id: string;
  leadId: string;
  leadName: string;
  propertyReference: string;
  inboundMessage: string;
  draftResponse: string;
  confidenceScore: number;
  memoryContext: string[];
  routingRationale: string;
  channel: string;
  status: "pending" | "hold" | "blocked";
  verificationStatus: string;
  governanceState: string;
  limitations: string[];
  nextAction: string;
}

export const demoApprovals: AIApprovalItem[] = [
  {
    id: "appr-sibusiso",
    leadId: "lead-sibusiso",
    leadName: "Sibusiso Ndlovu",
    propertyReference: "Sandton Penthouse (R4.2M)",
    inboundMessage: "Particularly interested in seeing it this Saturday if possible. I would also like to verify if it has backup solar system. Power grid has been unstable in that section.",
    draftResponse: "Hi Sibusiso! Yes, the Sandton Penthouse is available this Saturday. We have slot openings at 10:00 AM and 2:00 PM. Regarding power, the building is fully equipped with an integrated tier-1 hybrid inverter and solar array backed by dual Tesla Powerwall batteries, guaranteeing complete off-grid operational calm during grid outages. Which time slot works best for you?",
    confidenceScore: 94,
    memoryContext: [
      "Inquired about listing P24-8840294 (Sandton Penthouse).",
      "Preferred viewing window: Saturday morning or afternoon.",
      "Primary concern: load-shedding backup power reliability."
    ],
    routingRationale: "Addresses Saturday viewing request explicitly and satisfies the critical solar backup power inquiry using property record specifications (verified inventory item: solar + 10kWh battery).",
    channel: "WhatsApp",
    status: "pending",
    verificationStatus: "Identity Resolved via Ndlovu Holdings CRM",
    governanceState: "Pending Operator Verification",
    limitations: [
      "Cannot guarantee battery state-of-charge during consecutive multi-day grid outages."
    ],
    nextAction: "Verify if building battery storage matches exact layout specifications."
  },
  {
    id: "appr-sarah",
    leadId: "lead-sarah",
    leadName: "Sarah Jenkins",
    propertyReference: "Clifton Cliffside (R12M)",
    inboundMessage: "Hi, I'm looking at Clifton Apartment. Is it suitable for corporate rental and what are the viewing hours?",
    draftResponse: "Hello Sarah! Absolutely, the Clifton Cliffside residence is highly suitable for corporate lease agreements, offering a private fiber uplink, absolute security gates, and a layout optimized for professional residents. Viewing hours are strictly by appointment between 10 AM and 4 PM, Monday to Saturday. Would you like us to arrange a private viewing this week?",
    confidenceScore: 78,
    memoryContext: [
      "Resolved corporate consultant background via Global Consulting Group records.",
      "Identified Clifton premium listing preference.",
      "High business value indicator detected."
    ],
    routingRationale: "Held: Flagged by rule [SG-8: Solar backup validation]. Sandton/Clifton premium listings require manual validation of physical battery storage inventory.",
    channel: "WhatsApp",
    status: "hold",
    verificationStatus: "Company Match Verified // High Value Context",
    governanceState: "Solar Verification Hold",
    limitations: [
      "Manual survey of Clifton node switchboard required."
    ],
    nextAction: "Confirm physically deployed batteries match Sandton/Clifton node inventory records."
  },
  {
    id: "appr-david",
    leadId: "lead-david",
    leadName: "David Pieterse",
    propertyReference: "Stellenbosch Estate Villa (R8.9M)",
    inboundMessage: "Hi, interested in Stellenbosch estate. Please send details to my secondary mail david.p@associate-re.co.za.",
    draftResponse: "Hello David! I would be pleased to forward the comprehensive Stellenbosch Estate brochure and site details to your requested secondary email address. To ensure PII security and respect data-integrity rules, we must first verify your secondary address via security PIN. Shall I trigger the verification now?",
    confidenceScore: 62,
    memoryContext: [
      "Secondary email requested differs from captured inbound lead form email.",
      "Professional legal context detected via Pieterse & Associates."
    ],
    routingRationale: "Blocked: Rule [SG-3: Identity Verification Failed]. Secondary email request triggers automatic PII audit alert due to cross-domain mismatch.",
    channel: "Email",
    status: "blocked",
    verificationStatus: "Identity Conflict Detected // Verification Required",
    governanceState: "PII Security Block",
    limitations: [
      "Secondary address does not match primary CRM identity registration."
    ],
    nextAction: "Initiate manual phone verification to confirm secondary address validity before dispatching records."
  }
];

// Proposed calendar slots
export interface CalendarSlot {
  id: string;
  leadName: string;
  property: string;
  agentName: string;
  dateTime: string;
  status: "pending" | "approved" | "confirmed";
}

export const demoCalendarSlots: CalendarSlot[] = [
  {
    id: "slot-jessica",
    leadName: "Jessica Vandermerwe",
    property: "Camps Bay Beachfront Villa",
    agentName: "Amanda Venter (Luxury Specialist)",
    dateTime: new Date(Date.now() + 1.5 * 24 * 3600 * 1000).toISOString(), // Sunday Afternoon
    status: "approved"
  },
  {
    id: "slot-thabo",
    leadName: "Thabo Molefe",
    property: "Waterfall Country Estate",
    agentName: "Sipho Dube (Midrand Node)",
    dateTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    status: "confirmed"
  }
];

// Governance rules status
export interface GovernanceData {
  approvalQueueState: string;
  outboundLockState: "locked" | "governed" | "unlocked";
  channelSecurityStatus: string;
  auditTrail: { timestamp: string; event: string; actor: string }[];
  safeguardsChecklist: { id: string; label: string; checked: boolean }[];
}

export const demoGovernance: GovernanceData = {
  approvalQueueState: "Mandatory Human-in-the-Loop",
  outboundLockState: "governed",
  channelSecurityStatus: "All ingress vectors audited",
  auditTrail: [
    { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), event: "Outbound draft rejected: AI draft for David Pieterse fell below 80% confidence gate", actor: "Governance Guard" },
    { timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), event: "Approved outbound WhatsApp draft to Jessica Vandermerwe", actor: "Lead Architect" },
    { timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), event: "Secured inbound channel verification for Camps Bay Campaign Ingress", actor: "System Daemon" }
  ],
  safeguardsChecklist: [
    { id: "sg-1", label: "Multi-tenant strict logical schema isolation verified", checked: true },
    { id: "sg-2", label: "Outbound throttling thresholds active (< 60 messages/hr/node)", checked: true },
    { id: "sg-3", label: "PII redaction engine active for outbound channels", checked: true },
    { id: "sg-4", label: "Human-in-the-loop manual override override enabled", checked: true },
    { id: "sg-5", label: "Ingress security validation: CSRF + rate limiting", checked: true }
  ]
};

// Executive and Tenant Metrics
export const demoMetrics = {
  inboundVolume: 47,
  avgResponseTime: "2m 34s",
  qualificationRate: "68%",
  activeConversations: 12,
  pendingApprovals: 2,
  memoryGrowth: "+23 entries",
  pipelineValue: "R8.2M",
  healthScore: 99.8,
  governanceLocked: true,
  ingressAudited: true
};
