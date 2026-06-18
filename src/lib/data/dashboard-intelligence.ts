import { createClient } from "@/lib/supabase/server";
import { buildLeadQualificationSummary } from "@/lib/data/qualification";
import type { AutomationEvent, Channel, Conversation, Lead, LeadEvent, LeadPipelineStage, LeadTask, Message } from "@/lib/types";

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

export type RecentInboundActivity = {
  conversationId: string;
  leadId: string | null;
  leadName: string;
  channel: string;
  status: string;
  lastMessageAt: string | null;
  qualificationStatus: string | null;
  priority: string | null;
};

export type TenantSignalOrchestrationStep = {
  label: string;
  value: string;
  detail: string;
  tone: "safe" | "intelligence" | "warning" | "blocked";
};

export type TenantRoutingAuditEntry = {
  timestamp: string;
  event: string;
  actor: string;
  status: "verified" | "hold" | "blocked" | "system";
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
type RecentConversationRow = Pick<Conversation, "id" | "lead_id" | "status" | "subject" | "last_message_at" | "created_at"> & {
  channels?: Pick<Channel, "display_name" | "provider" | "channel_type"> | Pick<Channel, "display_name" | "provider" | "channel_type">[] | null;
  leads?: Pick<Lead, "id" | "full_name" | "priority" | "qualification_status"> | Pick<Lead, "id" | "full_name" | "priority" | "qualification_status">[] | null;
};
type AutomationEventRow = Pick<AutomationEvent, "id" | "event_type" | "aggregate_type" | "status" | "payload" | "created_at">;
type LeadEventRow = Pick<LeadEvent, "id" | "event_type" | "field_name" | "metadata" | "created_at">;
type AuditLogRow = {
  id: string;
  action: string;
  target_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

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

function titleLabel(value: string) {
  return value
    .replace(/[_.-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function countValue(count: number | null | undefined) {
  return count ?? 0;
}

function timeValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function routingStatusForAutomation(event: AutomationEventRow): TenantRoutingAuditEntry["status"] {
  const eventType = normalize(event.event_type);
  const status = normalize(event.status);
  if (status === "failed") return "blocked";
  if (status === "ignored") return "hold";
  if (eventType.includes("discard") || eventType.includes("reject") || eventType.includes("block")) return "blocked";
  if (eventType.includes("approval") || eventType.includes("review") || eventType.includes("draft")) return "hold";
  if (status === "processed") return "verified";
  return "system";
}

function routingStatusForLeadEvent(event: LeadEventRow): TenantRoutingAuditEntry["status"] {
  const eventType = normalize(event.event_type);
  if (eventType.includes("hold") || eventType.includes("task") || eventType.includes("approval")) return "hold";
  if (eventType.includes("blocked") || eventType.includes("failed")) return "blocked";
  if (eventType.includes("capture") || eventType.includes("identity") || eventType.includes("qualification")) return "verified";
  return "system";
}

function routingStatusForAuditLog(log: AuditLogRow): TenantRoutingAuditEntry["status"] {
  const action = normalize(log.action);
  if (action.includes("discard") || action.includes("block") || action.includes("fail")) return "blocked";
  if (action.includes("approval") || action.includes("draft") || action.includes("govern")) return "hold";
  if (action.includes("create") || action.includes("update") || action.includes("insert")) return "verified";
  return "system";
}

function isViewingReady(readiness: string) {
  return ["ready_for_viewing_discussion", "viewing_interest_detected", "viewing_requested", "viewing_booked"].includes(readiness);
}

export async function getRecentInboundActivity(organizationId: string, limit = 5): Promise<RecentInboundActivity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, lead_id, status, subject, last_message_at, created_at, channels(display_name, provider, channel_type), leads(id, full_name, priority, qualification_status)")
    .eq("organization_id", organizationId)
    .not("last_message_at", "is", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as RecentConversationRow[]).map((conversation) => {
    const channel = one(conversation.channels);
    const lead = one(conversation.leads);
    return {
      conversationId: conversation.id,
      leadId: lead?.id ?? conversation.lead_id,
      leadName: lead?.full_name ?? conversation.subject ?? "Inbound conversation",
      channel: channel?.display_name ?? channel?.provider ?? "Inbound channel",
      status: conversation.status,
      lastMessageAt: conversation.last_message_at,
      qualificationStatus: lead?.qualification_status ?? null,
      priority: lead?.priority ?? null,
    } satisfies RecentInboundActivity;
  });
}

export async function getTenantSignalOrchestrationSteps(
  organizationId: string,
  queues?: DashboardDealDeskQueues,
): Promise<TenantSignalOrchestrationStep[]> {
  const supabase = await createClient();
  const queueSnapshot = queues ?? await getDashboardDealDeskQueues(organizationId);
  const [leadCountRes, inboundMessageRes, qualifiedLeadRes, routedConversationRes, assignedLeadRes, pendingApprovalRes] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).neq("status", "archived"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("direction", "inbound"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("qualification_status", ["ai_qualified", "human_qualified"]),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).not("lead_id", "is", null),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).not("assigned_owner_user_id", "is", null).neq("status", "archived"),
    supabase.from("ai_message_drafts").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "draft"),
  ]);

  const leadCount = countValue(leadCountRes.count);
  const inboundMessages = countValue(inboundMessageRes.count);
  const qualifiedLeads = countValue(qualifiedLeadRes.count);
  const routedConversations = countValue(routedConversationRes.count);
  const assignedLeads = countValue(assignedLeadRes.count);
  const pendingApprovals = countValue(pendingApprovalRes.count);
  const viewingReady = queueSnapshot.viewingReadyLeads.length;

  return [
    {
      label: "Capture",
      value: `${inboundMessages} Inbound`,
      detail: `${leadCount} traceable lead${leadCount === 1 ? "" : "s"} in this tenant`,
      tone: inboundMessages > 0 ? "safe" : "intelligence",
    },
    {
      label: "Qualify",
      value: `${qualifiedLeads} Qualified`,
      detail: "AI/human-qualified lead records only",
      tone: qualifiedLeads > 0 ? "safe" : "intelligence",
    },
    {
      label: "Route",
      value: `${Math.max(routedConversations, assignedLeads)} Routed`,
      detail: `${routedConversations} lead-linked thread${routedConversations === 1 ? "" : "s"}, ${assignedLeads} assigned lead${assignedLeads === 1 ? "" : "s"}`,
      tone: routedConversations > 0 || assignedLeads > 0 ? "safe" : "intelligence",
    },
    {
      label: "Govern",
      value: `${pendingApprovals} Pending`,
      detail: "Draft approvals in the governed ledger",
      tone: pendingApprovals > 0 ? "warning" : "safe",
    },
    {
      label: "Viewing",
      value: `${viewingReady} Ready`,
      detail: "Computed from real lead, task, stage, and inbound signals",
      tone: viewingReady > 0 ? "safe" : "intelligence",
    },
  ];
}

export async function getTenantRoutingAuditTrail(organizationId: string, limit = 5): Promise<TenantRoutingAuditEntry[]> {
  const supabase = await createClient();
  const [{ data: automationEvents }, { data: leadEvents }, { data: auditLogs }] = await Promise.all([
    supabase
      .from("automation_events")
      .select("id, event_type, aggregate_type, status, payload, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("lead_events")
      .select("id, event_type, field_name, metadata, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_logs")
      .select("id, action, target_type, metadata, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const entries: TenantRoutingAuditEntry[] = [
    ...((automationEvents ?? []) as AutomationEventRow[]).map((event) => ({
      timestamp: event.created_at,
      event: `${titleLabel(event.event_type)} · ${titleLabel(event.aggregate_type)} · ${titleLabel(event.status)}`,
      actor: "Automation Event",
      status: routingStatusForAutomation(event),
    } satisfies TenantRoutingAuditEntry)),
    ...((leadEvents ?? []) as LeadEventRow[]).map((event) => ({
      timestamp: event.created_at,
      event: `${titleLabel(event.event_type)}${event.field_name ? ` · ${titleLabel(event.field_name)}` : ""}`,
      actor: "Lead Ledger",
      status: routingStatusForLeadEvent(event),
    } satisfies TenantRoutingAuditEntry)),
    ...((auditLogs ?? []) as AuditLogRow[]).map((log) => ({
      timestamp: log.created_at,
      event: `${titleLabel(log.action)}${log.target_type ? ` · ${titleLabel(log.target_type)}` : ""}`,
      actor: "Audit Log",
      status: routingStatusForAuditLog(log),
    } satisfies TenantRoutingAuditEntry)),
  ];

  return entries
    .sort((a, b) => timeValue(b.timestamp) - timeValue(a.timestamp))
    .slice(0, limit);
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
      const aTime = timeValue(a.lastInboundAt);
      const bTime = timeValue(b.lastInboundAt);
      if (bTime !== aTime) return bTime - aTime;
      if (b.score !== a.score) return b.score - a.score;
      return a.leadName.localeCompare(b.leadName);
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
      const aTime = timeValue(a.lastInboundAt);
      const bTime = timeValue(b.lastInboundAt);
      if (bTime !== aTime) return bTime - aTime;
      if (b.readinessScore !== a.readinessScore) return b.readinessScore - a.readinessScore;
      return a.leadName.localeCompare(b.leadName);
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
