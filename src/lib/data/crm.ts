import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";
import type { Lead, LeadEvent, LeadNote, LeadPipelineStage, LeadTask, OrganizationMember, Profile } from "@/lib/types";
import { isDemoMode } from "@/lib/demo/config";
import { demoLeads, demoPipelineStages, demoTasks, demoTimelineEvents } from "@/lib/demo/data";

export type OrgMemberWithProfile = OrganizationMember & { profile?: Pick<Profile, "full_name" | "email"> | null };

export async function getOrgMembers(organizationId: string, forceDemo?: boolean): Promise<OrgMemberWithProfile[]> {
  if (forceDemo || isDemoMode()) {
    return [
      {
        id: "demo-member-id",
        organization_id: "demo-org-id",
        user_id: "demo-operator-id",
        role: "admin",
        status: "active",
        profile: { full_name: "Lead Architect", email: "operator@genilabs.ai" }
      }
    ] as OrgMemberWithProfile[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role, status, profiles!organization_members_user_id_fkey(full_name, email)")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) return [];

  return (data ?? []).map((member) => ({
    id: member.id,
    organization_id: member.organization_id,
    user_id: member.user_id,
    role: member.role,
    status: member.status,
    profile: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
  })) as OrgMemberWithProfile[];
}

export async function getPipelineStages(organizationId: string, forceDemo?: boolean): Promise<LeadPipelineStage[]> {
  if (forceDemo || isDemoMode()) {
    return demoPipelineStages;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_pipeline_stages")
    .select("id, organization_id, name, slug, position, probability, is_closed, is_won")
    .eq("organization_id", organizationId)
    .order("position", { ascending: true });

  if (error) return [];
  return (data ?? []) as LeadPipelineStage[];
}

export async function getLeadList(orgSlug: string, forceDemo?: boolean): Promise<{ tenant: Awaited<ReturnType<typeof resolveTenantBySlug>>; leads: Lead[]; members: OrgMemberWithProfile[]; stages: LeadPipelineStage[] }> {
  if (forceDemo || isDemoMode()) {
    const tenant = await resolveTenantBySlug(orgSlug, true);
    const leads = demoLeads;
    const members = await getOrgMembers(tenant.organization.id, true);
    const stages = demoPipelineStages;
    return { tenant, leads, members, stages };
  }

  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const [{ data: leads }, members, stages] = await Promise.all([
    supabase
      .from("leads")
      .select("id, organization_id, pipeline_stage_id, full_name, email, phone, normalized_email, normalized_phone_e164, identity_confidence, company, status, priority, estimated_value, exact_source, source_subtype, original_inbound_channel, source_reference, captured_at, first_contact_at, qualification_status, ai_qualification_decision_path, lead_origin_metadata, assigned_owner_user_id, created_by_user_id, updated_by_user_id, created_at, updated_at")
      .eq("organization_id", tenant.organization.id)
      .order("created_at", { ascending: false }),
    getOrgMembers(tenant.organization.id),
    getPipelineStages(tenant.organization.id),
  ]);

  return { tenant, leads: (leads ?? []) as Lead[], members, stages };
}

export async function getLeadDetail(orgSlug: string, leadId: string, forceDemo?: boolean) {
  if (forceDemo || isDemoMode()) {
    const tenant = await resolveTenantBySlug(orgSlug, true);
    const lead = demoLeads.find((l) => l.id === leadId) || demoLeads[0];
    const notes: LeadNote[] = [];
    const events = demoTimelineEvents[lead.id] || [];
    const tasks = demoTasks.filter((t) => t.lead_id === lead.id);
    const stages = demoPipelineStages;
    const members = await getOrgMembers(tenant.organization.id, true);

    return {
      tenant,
      lead: lead as Lead,
      notes,
      events,
      tasks,
      members,
      stages,
    };
  }

  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, organization_id, pipeline_stage_id, full_name, email, phone, normalized_email, normalized_phone_e164, identity_confidence, company, status, priority, estimated_value, exact_source, source_subtype, original_inbound_channel, source_reference, captured_at, first_contact_at, qualification_status, ai_qualification_decision_path, lead_origin_metadata, assigned_owner_user_id, created_by_user_id, updated_by_user_id, created_at, updated_at")
    .eq("organization_id", tenant.organization.id)
    .eq("id", leadId)
    .single();

  if (error || !lead) redirect(`/app/${orgSlug}/leads?error=lead-not-found`);

  const [{ data: notes }, { data: events }, { data: tasks }, members, stages] = await Promise.all([
    supabase
      .from("lead_notes")
      .select("id, organization_id, lead_id, author_user_id, body, visibility, created_at, updated_at")
      .eq("organization_id", tenant.organization.id)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_events")
      .select("id, organization_id, lead_id, actor_user_id, event_type, field_name, old_value, new_value, metadata, created_at")
      .eq("organization_id", tenant.organization.id)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("lead_tasks")
      .select("id, organization_id, lead_id, title, description, status, priority, due_at, assigned_to_user_id, created_by_user_id, completed_at, created_at, updated_at")
      .eq("organization_id", tenant.organization.id)
      .eq("lead_id", leadId)
      .order("due_at", { ascending: true, nullsFirst: false }),
    getOrgMembers(tenant.organization.id),
    getPipelineStages(tenant.organization.id),
  ]);

  return {
    tenant,
    lead: lead as Lead,
    notes: (notes ?? []) as LeadNote[],
    events: (events ?? []) as LeadEvent[],
    tasks: (tasks ?? []) as LeadTask[],
    members,
    stages,
  };
}

export async function getTaskList(orgSlug: string, forceDemo?: boolean) {
  if (forceDemo || isDemoMode()) {
    const tenant = await resolveTenantBySlug(orgSlug, true);
    const tasks = demoTasks;
    const members = await getOrgMembers(tenant.organization.id, true);
    return { tenant, tasks, members };
  }

  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const [{ data: tasks }, members] = await Promise.all([
    supabase
      .from("lead_tasks")
      .select("id, organization_id, lead_id, title, description, status, priority, due_at, assigned_to_user_id, created_by_user_id, completed_at, created_at, updated_at, leads(id, full_name, status)")
      .eq("organization_id", tenant.organization.id)
      .order("status", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false }),
    getOrgMembers(tenant.organization.id),
  ]);

  const normalizedTasks = (tasks ?? []).map((task) => ({
    ...task,
    leads: Array.isArray(task.leads) ? task.leads[0] : task.leads,
  })) as LeadTask[];

  return { tenant, tasks: normalizedTasks, members };
}

export function displayMember(members: OrgMemberWithProfile[], userId: string | null) {
  if (!userId) return "Unassigned";
  const member = members.find((item) => item.user_id === userId);
  return member?.profile?.full_name || member?.profile?.email || "Assigned user";
}
