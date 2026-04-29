"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { getOrgMembers } from "@/lib/data/crm";

function text(value: FormDataEntryValue | null, fallback = "") {
  const next = typeof value === "string" ? value.trim() : "";
  return next || fallback;
}

function nullableText(value: FormDataEntryValue | null) {
  const next = text(value);
  return next || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const next = text(value);
  if (!next) return null;
  const parsed = Number(next);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableTimestamp(value: FormDataEntryValue | null) {
  const next = text(value);
  if (!next) return null;
  const parsed = new Date(next);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function jsonArray(value: FormDataEntryValue | null) {
  const next = text(value);
  if (!next) return [];
  try {
    const parsed = JSON.parse(next);
    return Array.isArray(parsed) ? parsed : [{ note: next }];
  } catch {
    return [{ note: next }];
  }
}

function safeStatus(value: FormDataEntryValue | null) {
  const allowed = ["new", "contacted", "qualified", "proposal", "won", "lost", "archived"];
  const next = text(value, "new");
  return allowed.includes(next) ? next : "new";
}

function safePriority(value: FormDataEntryValue | null) {
  const allowed = ["low", "medium", "high", "urgent"];
  const next = text(value, "medium");
  return allowed.includes(next) ? next : "medium";
}

function safeQualification(value: FormDataEntryValue | null) {
  const allowed = ["unqualified", "ai_review_pending", "ai_qualified", "human_qualified", "disqualified", "nurture"];
  const next = text(value, "unqualified");
  return allowed.includes(next) ? next : "unqualified";
}

async function assertAssignable(organizationId: string, assignedUserId: string | null) {
  if (!assignedUserId) return null;
  const members = await getOrgMembers(organizationId);
  return members.some((member) => member.user_id === assignedUserId) ? assignedUserId : null;
}

export async function createLead(orgSlug: string, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();

  const fullName = text(formData.get("full_name"));
  const exactSource = text(formData.get("exact_source"));
  const sourceSubtype = text(formData.get("source_subtype"));
  const originalInboundChannel = text(formData.get("original_inbound_channel"));

  if (!fullName || !exactSource || !sourceSubtype || !originalInboundChannel) {
    redirect(`/app/${orgSlug}/leads/new?error=source-integrity-required`);
  }

  const assignedOwner = await assertAssignable(tenant.organization.id, nullableText(formData.get("assigned_owner_user_id")));
  const pipelineStageId = nullableText(formData.get("pipeline_stage_id"));
  const capturedAt = nullableTimestamp(formData.get("captured_at")) ?? new Date().toISOString();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: tenant.organization.id,
      pipeline_stage_id: pipelineStageId,
      full_name: fullName,
      email: nullableText(formData.get("email")),
      phone: nullableText(formData.get("phone")),
      company: nullableText(formData.get("company")),
      status: safeStatus(formData.get("status")),
      priority: safePriority(formData.get("priority")),
      estimated_value: nullableNumber(formData.get("estimated_value")),
      exact_source: exactSource,
      source_subtype: sourceSubtype,
      original_inbound_channel: originalInboundChannel,
      source_reference: nullableText(formData.get("source_reference")),
      captured_at: capturedAt,
      first_contact_at: nullableTimestamp(formData.get("first_contact_at")),
      qualification_status: safeQualification(formData.get("qualification_status")),
      ai_qualification_decision_path: jsonArray(formData.get("ai_qualification_decision_path")),
      lead_origin_metadata: {
        captured_by: "agentflow_dashboard",
        entered_by_user_id: tenant.profile.id,
        source_doctrine: "lead_source_integrity",
      },
      assigned_owner_user_id: assignedOwner,
      created_by_user_id: tenant.profile.id,
      updated_by_user_id: tenant.profile.id,
    })
    .select("id")
    .single();

  if (error || !lead) redirect(`/app/${orgSlug}/leads/new?error=create-failed`);

  await supabase.from("audit_logs").insert({
    organization_id: tenant.organization.id,
    actor_user_id: tenant.profile.id,
    action: "lead.created",
    target_type: "lead",
    target_id: lead.id,
    metadata: { exact_source: exactSource, source_subtype: sourceSubtype, original_inbound_channel: originalInboundChannel },
  });

  revalidatePath(`/app/${orgSlug}/dashboard`);
  redirect(`/app/${orgSlug}/leads/${lead.id}?created=1`);
}

export async function updateLeadState(orgSlug: string, leadId: string, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const assignedOwner = await assertAssignable(tenant.organization.id, nullableText(formData.get("assigned_owner_user_id")));

  const { error } = await supabase
    .from("leads")
    .update({
      pipeline_stage_id: nullableText(formData.get("pipeline_stage_id")),
      status: safeStatus(formData.get("status")),
      priority: safePriority(formData.get("priority")),
      qualification_status: safeQualification(formData.get("qualification_status")),
      ai_qualification_decision_path: jsonArray(formData.get("ai_qualification_decision_path")),
      assigned_owner_user_id: assignedOwner,
      first_contact_at: nullableTimestamp(formData.get("first_contact_at")),
      updated_by_user_id: tenant.profile.id,
    })
    .eq("organization_id", tenant.organization.id)
    .eq("id", leadId);

  if (error) redirect(`/app/${orgSlug}/leads/${leadId}?error=state-update-failed`);

  await supabase.from("audit_logs").insert({
    organization_id: tenant.organization.id,
    actor_user_id: tenant.profile.id,
    action: "lead.updated",
    target_type: "lead",
    target_id: leadId,
    metadata: { source: "crm_detail" },
  });

  revalidatePath(`/app/${orgSlug}/leads/${leadId}`);
  redirect(`/app/${orgSlug}/leads/${leadId}?saved=1`);
}

export async function addLeadNote(orgSlug: string, leadId: string, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const body = text(formData.get("body"));
  if (!body) redirect(`/app/${orgSlug}/leads/${leadId}?error=note-required`);

  const { error } = await supabase.from("lead_notes").insert({
    organization_id: tenant.organization.id,
    lead_id: leadId,
    author_user_id: tenant.profile.id,
    body,
    visibility: "internal",
  });

  if (error) redirect(`/app/${orgSlug}/leads/${leadId}?error=note-failed`);
  revalidatePath(`/app/${orgSlug}/leads/${leadId}`);
  redirect(`/app/${orgSlug}/leads/${leadId}?note=1`);
}

export async function createLeadTask(orgSlug: string, leadId: string | null, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const title = text(formData.get("title"));
  if (!title) redirect(leadId ? `/app/${orgSlug}/leads/${leadId}?error=task-title-required` : `/app/${orgSlug}/tasks?error=task-title-required`);

  const assignedTo = await assertAssignable(tenant.organization.id, nullableText(formData.get("assigned_to_user_id")));
  const { error } = await supabase.from("lead_tasks").insert({
    organization_id: tenant.organization.id,
    lead_id: leadId,
    title,
    description: nullableText(formData.get("description")),
    priority: safePriority(formData.get("priority")),
    due_at: nullableTimestamp(formData.get("due_at")),
    assigned_to_user_id: assignedTo,
    created_by_user_id: tenant.profile.id,
  });

  if (error) redirect(leadId ? `/app/${orgSlug}/leads/${leadId}?error=task-failed` : `/app/${orgSlug}/tasks?error=task-failed`);
  revalidatePath(`/app/${orgSlug}/tasks`);
  if (leadId) {
    revalidatePath(`/app/${orgSlug}/leads/${leadId}`);
    redirect(`/app/${orgSlug}/leads/${leadId}?task=1`);
  }
  redirect(`/app/${orgSlug}/tasks?created=1`);
}

export async function updateLeadTaskStatus(orgSlug: string, taskId: string, formData: FormData) {
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const status = text(formData.get("status"), "open");
  const safeTaskStatus = ["open", "in_progress", "completed", "cancelled"].includes(status) ? status : "open";

  const { error } = await supabase
    .from("lead_tasks")
    .update({
      status: safeTaskStatus,
      completed_at: safeTaskStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("organization_id", tenant.organization.id)
    .eq("id", taskId);

  if (error) redirect(`/app/${orgSlug}/tasks?error=task-update-failed`);
  revalidatePath(`/app/${orgSlug}/tasks`);
  redirect(`/app/${orgSlug}/tasks?saved=1`);
}
