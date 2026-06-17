import { createClient } from "@/lib/supabase/server";
import { buildLeadQualificationSummary } from "@/lib/data/qualification";
import type { Lead, LeadPipelineStage, LeadTask, Message } from "@/lib/types";

export type HotLeadAction = {
  leadId: string;
  leadName: string;
  priority: string;
  qualificationStatus: string;
  stageName: string;
  score: number;
  signal: string;
  urgency: string;
  readinessScore: number;
  viewingReadiness: string;
  nextAction: string;
  lastInboundAt: string | null;
  taskTitle: string | null;
};

export type ViewingReadyLead = {
  leadId: string;
  leadName: string;
  stageName: string;
  qualificationStatus: string;
  readinessScore: number;
  viewingReadiness: string;
  lastInboundAt: string | null;
  nextAction: string;
};

export type DashboardDealDeskQueues = {
  hotLeadActions: HotLeadAction[];
  viewingReadyLeads: ViewingReadyLead[];
};

type LeadRow = Pick<
  Lead,
  | "id"
  | "full_name"
  | "email"
  | "phone"
  | "identity_confidence"
  | "priority"
  | "qualification_status"
  | "pipeline_stage_id"
  | "estimated_value"
  | "captured_at"
  | "first_contact_at"
  | "status"
  | "exact_source"
  | "source_subtype"
  | "original_inbound_channel"
  | "source_reference"
  | "ai_qualification_decision_path"
  | "lead_origin_metadata"
>;

type StageRow = Pick<LeadPipelineStage, "id" | "name" | "slug" | "probability">;
type TaskRow = Pick<LeadTask, "id" | "lead_id" | "title" | "description" | "status" | "priority" | "due_at">;
type MessageRow = Pick<Message, "lead_id" | "occurred_at" | "direction">;

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / 86_400_000;
}

function priorityScore(priority: string) {
  const normalized = normalize(priority);
  if (normalized === "urgent") return 45;
  if (normalized === "high") return 35;
  if (normalized === "medium") return 12;
  return 0;
}

function taskScore(task: TaskRow | null) {
  if (!task) return 0;
  const priority = normalize(task.priority);
  const dueAge = daysSince(task.due_at);
  const dueBoost = dueAge !== null && dueAge >= 0 ? 12 : 0;
  if (priority === "urgent") return 28 + dueBoost;
  if (priority === "high") return 22 + dueBoost;
  if (priority === "medium") return 12 + dueBoost;
  return 8 + dueBoost;
}

function inboundScore(lastInboundAt: string | null) {
  const age = daysSince(lastInboundAt);
  if (age === null) return 0;
  if (age <= 1) return 14;
  if (age <= 7) return 8;
  return 2;
}

function isOpenTask(task: TaskRow) {
  return ["open", "in_progress"].includes(normalize(task.status));
}

function firstTaskForLead(tasks: TaskRow[], leadId: string) {
  const leadTasks = tasks.filter((task) => task.lead_id === leadId && isOpenTask(task));
  return leadTasks.sort((a, b) => {
    const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  })[0] ?? null;
}

function lastInboundForLead(messages: MessageRow[], leadId: string) {
  return messages.find((message) => message.lead_id === leadId)?.occurred_at ?? null;
}

function signalFor(lead: LeadRow, stage: StageRow | null, task: TaskRow | null, lastInboundAt: string | null, viewingReadiness: string) {
  if (task) return `Open task: ${task.priority}`;
  if (viewingReadiness === "viewing_booked") return "Viewing booked";
  if (viewingReadiness === "viewing_requested") return "Viewing requested";
  if (viewingReadiness === "ready_for_viewing_discussion") return "Viewing discussion ready";
  if (lastInboundAt) return "Recent inbound activity";
  if (["urgent", "high"].includes(normalize(lead.priority))) return `${lead.priority} priority`;
  if (["ai_qualified", "human_qualified"].includes(normalize(lead.qualification_status))) return "Qualified lead";
  const stageText = `${normalize(stage?.name)} ${normalize(stage?.slug)}`;
  if (includesAny(stageText, ["qualification", "qualify"])) return "Qualification in progress";
  return "Pipeline attention";
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function isViewingReady(readiness: string) {
  return ["ready_for_viewing_discussion", "viewing_interest_detected", "viewing_requested", "viewing_booked"].includes(readiness);
}

export async function getDashboardDealDeskQueues(organizationId: string): Promise<DashboardDealDeskQueues> {
  const supabase = await createClient();
  const [{ data: leads }, { data: stages }, { data: tasks }, { data: messages }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, full_name, email, phone, identity_confidence, priority, qualification_status, pipeline_stage_id, estimated_value, captured_at, first_contact_at, status, exact_source, source_subtype, original_inbound_channel, source_reference, ai_qualification_decision_path, lead_origin_metadata")
      .eq("organization_id", organizationId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(75),
    supabase
      .from("lead_pipeline_stages")
      .select("id, name, slug, probability")
      .eq("organization_id", organizationId),
    supabase
      .from("lead_tasks")
      .select("id, lead_id, title, description, status, priority, due_at")
      .eq("organization_id", organizationId)
      .in("status", ["open", "in_progress"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(150),
    supabase
      .from("messages")
      .select("lead_id, occurred_at, direction")
      .eq("organization_id", organizationId)
      .eq("direction", "inbound")
      .not("lead_id", "is", null)
      .order("occurred_at", { ascending: false })
      .limit(250),
  ]);

  const stageById = new Map((stages ?? []).map((stage) => [stage.id, stage as StageRow]));
  const taskRows = (tasks ?? []) as TaskRow[];
  const messageRows = (messages ?? []) as MessageRow[];

  const intelligence = ((leads ?? []) as LeadRow[]).map((lead) => {
    const stage = lead.pipeline_stage_id ? stageById.get(lead.pipeline_stage_id) ?? null : null;
    const leadTasks = taskRows.filter((task) => task.lead_id === lead.id);
    const task = firstTaskForLead(taskRows, lead.id);
    const lastInboundAt = lastInboundForLead(messageRows, lead.id);
    const summary = buildLeadQualificationSummary(lead, stage, leadTasks, { lastInboundAt });
    const stageName = stage?.name ?? "Unstaged";
    const score = Math.min(
      100,
      priorityScore(lead.priority)
        + taskScore(task)
        + inboundScore(lastInboundAt)
        + Math.round(summary.readinessScore * 0.42)
        + (summary.viewingReadiness.startsWith("viewing") || summary.viewingReadiness === "ready_for_viewing_discussion" ? 16 : 0)
        + (lead.estimated_value && lead.estimated_value > 0 ? 5 : 0),
    );

    return {
      lead,
      stageName,
      task,
      lastInboundAt,
      summary,
      score,
    };
  });

  const hotLeadActions = intelligence
    .map(({ lead, stageName, task, lastInboundAt, summary, score }) => ({
      leadId: lead.id,
      leadName: lead.full_name,
      priority: lead.priority,
      qualificationStatus: lead.qualification_status,
      stageName,
      score,
      signal: signalFor(lead, stageById.get(lead.pipeline_stage_id ?? "") ?? null, task, lastInboundAt, summary.viewingReadiness),
      urgency: label(summary.urgency),
      readinessScore: summary.readinessScore,
      viewingReadiness: label(summary.viewingReadiness),
      nextAction: summary.nextBestAction,
      lastInboundAt,
      taskTitle: task?.title ?? null,
    } satisfies HotLeadAction))
    .filter((item) => item.score > 0 || item.taskTitle !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTime = a.lastInboundAt ? new Date(a.lastInboundAt).getTime() : 0;
      const bTime = b.lastInboundAt ? new Date(b.lastInboundAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const viewingReadyLeads = intelligence
    .filter(({ summary }) => isViewingReady(summary.viewingReadiness))
    .map(({ lead, stageName, lastInboundAt, summary }) => ({
      leadId: lead.id,
      leadName: lead.full_name,
      stageName,
      qualificationStatus: lead.qualification_status,
      readinessScore: summary.readinessScore,
      viewingReadiness: label(summary.viewingReadiness),
      lastInboundAt,
      nextAction: summary.nextBestAction,
    } satisfies ViewingReadyLead))
    .sort((a, b) => {
      if (b.readinessScore !== a.readinessScore) return b.readinessScore - a.readinessScore;
      const aTime = a.lastInboundAt ? new Date(a.lastInboundAt).getTime() : 0;
      const bTime = b.lastInboundAt ? new Date(b.lastInboundAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  return { hotLeadActions, viewingReadyLeads };
}

export async function getHotLeadActions(organizationId: string): Promise<HotLeadAction[]> {
  const queues = await getDashboardDealDeskQueues(organizationId);
  return queues.hotLeadActions;
}

export async function getViewingReadyLeads(organizationId: string): Promise<ViewingReadyLead[]> {
  const queues = await getDashboardDealDeskQueues(organizationId);
  return queues.viewingReadyLeads;
}
