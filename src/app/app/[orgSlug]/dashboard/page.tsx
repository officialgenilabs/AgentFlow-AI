import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { isDemoMode } from "@/lib/demo/config";
import { demoLeads, demoPipelineStages, demoTasks, demoMetrics } from "@/lib/demo/data";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Badge } from "@/components/ui/badge";
import { PendingApprovalsSummary } from "@/components/dashboard/pending-approvals-summary";
import { HotLeadsNextActions } from "@/components/dashboard/hot-leads-next-actions";
import { ViewingReadyQueue } from "@/components/dashboard/viewing-ready-queue";
import { SignalOrchestrationFlow } from "@/components/dashboard/signal-orchestration-flow";
import { RoutingAuditTrail } from "@/components/dashboard/routing-audit-trail";
import { getApprovalQueue } from "@/lib/data/approvals";
import {
  getDashboardDealDeskQueues,
  getRecentInboundActivity,
  getTenantRoutingAuditTrail,
  getTenantSignalOrchestrationSteps,
  type HotLeadAction,
  type RecentInboundActivity,
  type TenantRoutingAuditEntry,
  type TenantSignalOrchestrationStep,
  type ViewingReadyLead,
} from "@/lib/data/dashboard-intelligence";
import type { Lead, LeadPipelineStage } from "@/lib/types";
import {
  Users,
  ListChecks,
  TrendingUp,
  ArrowRight,
  MessageSquare,
  RadioTower
} from "lucide-react";

function formatActivityTime(value: string | null) {
  if (!value) return "No timestamp";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Timestamp unavailable";
  return parsed.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

export default async function TenantDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  let leadCount = 0;
  let openTaskCount = 0;
  let recentLeads: (Pick<Lead, "id" | "full_name" | "status" | "qualification_status" | "exact_source" | "original_inbound_channel"> & { priority?: string | null })[] = [];
  let pipeline: Pick<LeadPipelineStage, "id" | "name" | "probability">[] = [];
  let pipelineValue = "R0.00";
  let activeConversations = 0;
  let avgResponseTime = "N/A";
  let qualificationRate = "N/A";
  let pendingApprovalCount = 0;
  let pendingApprovalItems: { leadName: string; property: string; status: "pending" | "hold" | "blocked"; confidence?: number }[] = [];
  let hotLeadActions: HotLeadAction[] = [];
  let viewingReadyLeads: ViewingReadyLead[] = [];
  let recentInboundActivity: RecentInboundActivity[] = [];
  let signalOrchestrationSteps: TenantSignalOrchestrationStep[] = [];
  let routingAuditEntries: TenantRoutingAuditEntry[] = [];

  if (isDemoMode()) {
    leadCount = demoLeads.length;
    openTaskCount = demoTasks.filter(t => t.status === "open").length;
    recentLeads = demoLeads;
    pipeline = demoPipelineStages;
    pipelineValue = demoMetrics.pipelineValue;
    activeConversations = demoMetrics.activeConversations;
    avgResponseTime = demoMetrics.avgResponseTime;
    qualificationRate = demoMetrics.qualificationRate;
  } else {
    const supabase = await createClient();
    const [leadRes, taskRes, recentRes, pipelineRes, conversationRes, qualifiedRes, approvalQueue, dealDeskQueues, inboundActivity, routingEntries] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id),
      supabase.from("lead_tasks").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id).in("status", ["open", "in_progress"]),
      supabase.from("leads").select("id, full_name, status, priority, qualification_status, exact_source, source_subtype, original_inbound_channel, created_at").eq("organization_id", tenant.organization.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("lead_pipeline_stages").select("id, name, slug, probability, position").eq("organization_id", tenant.organization.id).order("position", { ascending: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id).in("status", ["open", "handoff"]),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id).in("qualification_status", ["ai_qualified", "human_qualified"]),
      getApprovalQueue(orgSlug),
      getDashboardDealDeskQueues(tenant.organization.id),
      getRecentInboundActivity(tenant.organization.id),
      getTenantRoutingAuditTrail(tenant.organization.id),
    ]);

    leadCount = leadRes.count ?? 0;
    openTaskCount = taskRes.count ?? 0;
    recentLeads = recentRes.data ?? [];
    pipeline = pipelineRes.data ?? [];
    activeConversations = conversationRes.count ?? 0;
    qualificationRate = leadCount > 0 ? `${Math.round(((qualifiedRes.count ?? 0) / leadCount) * 100)}%` : "N/A";
    pendingApprovalCount = approvalQueue.items.length;
    pendingApprovalItems = approvalQueue.items.slice(0, 3).map((item) => ({
      leadName: item.leadName,
      property: item.propertyReference,
      status: item.status,
      confidence: item.confidenceScore,
    }));
    hotLeadActions = dealDeskQueues.hotLeadActions;
    viewingReadyLeads = dealDeskQueues.viewingReadyLeads;
    recentInboundActivity = inboundActivity;
    routingAuditEntries = routingEntries;
    signalOrchestrationSteps = await getTenantSignalOrchestrationSteps(tenant.organization.id, dealDeskQueues);

    // Estimate a real pipeline value or use a fallback
    const { data: valueData } = await supabase
      .from("leads")
      .select("estimated_value")
      .eq("organization_id", tenant.organization.id);
    const sum = (valueData ?? []).reduce((acc, curr) => acc + (curr.estimated_value || 0), 0);
    pipelineValue = sum > 0
      ? `R${(sum / 1000000).toFixed(1)}M`
      : "R0";

    // Response timing requires a confirmed inbound-to-draft metric. Keep honest until enough real events exist.
    avgResponseTime = "N/A";
  }

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="space-y-6">

        {/* KPI Overview Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Traceable Leads"
            value={leadCount}
            description="Leads with verified source attribution"
            icon={<Users className="size-4" />}
          />
          <MetricCard
            title="Pipeline Volume"
            value={pipelineValue}
            description="Aggregated potential context value"
            glow={isDemoMode()}
            icon={<TrendingUp className="size-4 text-[#00E599]" />}
          />
          <MetricCard
            title="Active Operations"
            value={activeConversations}
            description="Dynamic messaging threads currently active"
            icon={<MessageSquare className="size-4 text-[#6C63FF]" />}
          />
          <MetricCard
            title="Open Tasks"
            value={openTaskCount}
            description="Required manual operator actions"
            icon={<ListChecks className="size-4" />}
          />
        </div>

        {signalOrchestrationSteps.length > 0 && (
          <SignalOrchestrationFlow
            title="Production Signal Orchestration"
            description="Tenant-backed capture, qualification, routing, governance, and viewing readiness signals. Counts come from live AgentFlow tables only."
            steps={signalOrchestrationSteps}
            mode="tenant"
          />
        )}

        {!isDemoMode() && (
          <Card className="border-white/[0.06] bg-[#111111]/75">
            <CardHeader className="border-b border-white/[0.04] pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-heading font-extrabold text-white">
                    <RadioTower className="size-4 text-[#00E599]" /> New Inbound Activity
                  </CardTitle>
                  <CardDescription className="text-xs text-white/45">
                    Newest tenant conversations first, ordered by last inbound message timestamp.
                  </CardDescription>
                </div>
                <Badge variant="orchestration">{recentInboundActivity.length} Recent</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {recentInboundActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center text-xs font-semibold uppercase tracking-wider text-white/35">
                  No inbound tenant messages captured yet. This queue will populate from real message activity only.
                </div>
              ) : (
                recentInboundActivity.map((activity) => (
                  <Link
                    key={activity.conversationId}
                    href={`/app/${orgSlug}/inbox`}
                    className="block rounded-2xl border border-[#00E599]/15 bg-[#00E599]/[0.035] p-4 transition-colors hover:border-[#00E599]/30 hover:bg-[#00E599]/[0.055]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-heading font-extrabold text-white">{activity.leadName}</p>
                        <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">
                          {activity.channel} · {activity.status}
                        </p>
                      </div>
                      <Badge variant={activity.priority === "urgent" ? "error" : activity.priority === "high" ? "warning" : "mint"}>
                        {activity.priority ?? "Inbound"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] pt-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">
                      <span>{activity.qualificationStatus ?? "Qualification pending"}</span>
                      <span className="text-[#00E599]">{formatActivityTime(activity.lastMessageAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Phase 10A: AI Deal Desk visibility widgets */}
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <PendingApprovalsSummary
            items={pendingApprovalItems}
            totalCount={pendingApprovalCount}
            href={`/app/${orgSlug}/approvals`}
            ctaLabel={pendingApprovalCount > 0 ? "Review Next Draft" : "Open Approvals"}
            emptyState="No production drafts pending review. Real approval state is synchronized from the governed draft ledger."
          />
          <HotLeadsNextActions orgSlug={orgSlug} items={hotLeadActions} />
        </div>

        <ViewingReadyQueue orgSlug={orgSlug} items={viewingReadyLeads} />

        {!isDemoMode() && (
          <RoutingAuditTrail
            entries={routingAuditEntries}
            title="Production Routing Audit Trail"
            description="Newest real automation, lead, and audit ledger events available for this tenant. No synthetic routing events are shown."
            emptyState="No tenant routing evidence has been written yet. This surface is intentionally empty until real automation, lead, or audit ledger events exist."
          />
        )}

        {/* Operational Efficiency Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-[#00E599] rounded-full blur-[80px] opacity-10 pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#00E599] uppercase">
                LATENCY GATEWAY
              </span>
              <CardTitle className="text-xl font-heading font-extrabold mt-1">
                Response Speed: {avgResponseTime}
              </CardTitle>
              <CardDescription className="text-xs text-white/50 leading-relaxed">
                Displayed only after real inbound-to-draft timing events exist; production does not estimate this metric.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-[#6C63FF] rounded-full blur-[80px] opacity-10 pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#A29EFF] uppercase">
                GOVERNED CONVERSION
              </span>
              <CardTitle className="text-xl font-heading font-extrabold mt-1">
                Qualification Rate: {qualificationRate}
              </CardTitle>
              <CardDescription className="text-xs text-white/50 leading-relaxed">
                Percentage of captured leads successfully resolving through AI and manual governance gates.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Centerpiece Interactive Console */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl relative overflow-hidden">
          {/* subtle radial accent */}
          <div className="absolute inset-0 bg-radial-at-t from-[#00E599]/[0.02] via-transparent to-transparent pointer-events-none" />
          <CardHeader className="border-b border-white/[0.04] pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Operational Command Engine</CardTitle>
                <CardDescription className="text-xs">
                  Contextual lead flow pipelines, ingress control, and governance layers.
                </CardDescription>
              </div>
              <Badge variant="mint">
                <StatusIndicator status="active" className="mr-1.5" pulse={isDemoMode()} />
                {isDemoMode() ? "Demo Mode Staging Active" : "Live Tenant Intelligence"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 sm:p-8">
              <span className="text-[10px] font-mono font-bold tracking-widest text-white/30 uppercase">
                {tenant.organization.name}
              </span>
              <h2 className="mt-2 text-2xl font-heading font-extrabold text-white leading-tight">
                Traceable lead acquisition you can trust.
              </h2>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/55">
                Every lead preserves exact source metadata, source subtype, original capture channel, timing logs, qualification confidence, AI decision path, and generated events. Completely governed, calm, and bulletproof.
              </p>

              {/* Quick Navigation Panel */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl shadow-[0_0_15px_rgba(0,229,153,0.15)]">
                  <Link href={`/app/${orgSlug}/leads/new`}>
                    Create traceable lead <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="bg-white/[0.03] border-white/[0.06] text-white hover:bg-white/[0.06] rounded-xl">
                  <Link href={`/app/${orgSlug}/leads`}>
                    View pipeline
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Stage Tracker & Recent Leads */}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

          {/* Recent Leads list */}
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
            <CardHeader className="border-b border-white/[0.04] pb-4">
              <CardTitle className="text-base">Recent Traceable Leads</CardTitle>
              <CardDescription className="text-xs">
                Latest source-attributed CRM records.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {recentLeads.slice(0, 4).map((lead) => (
                <Link
                  key={lead.id}
                  href={`/app/${orgSlug}/leads/${lead.id}`}
                  className="block rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] p-4 hover:border-white/[0.08] transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-heading font-extrabold text-sm text-white">{lead.full_name}</p>
                      <p className="mt-1 text-xs text-white/50 font-medium">
                        Status: <span className="text-white/70">{lead.status}</span> • Qual: <span className="text-[#00E599]">{lead.qualification_status}</span>
                      </p>
                    </div>
                    <Badge variant={lead.priority === "urgent" ? "error" : lead.priority === "high" ? "warning" : "neutral"}>
                      {lead.priority}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.03] pt-2 text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                    <span>Source: {lead.exact_source}</span>
                    <span>Channel: {lead.original_inbound_channel}</span>
                  </div>
                </Link>
              ))}
              {recentLeads.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center">
                  <p className="text-xs font-heading font-extrabold uppercase tracking-wider text-white/60">
                    No leads captured yet
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-[10px] font-mono font-bold uppercase tracking-widest leading-relaxed text-white/35">
                    Start the first value loop: lead received → qualification context → viewing next action.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button asChild size="sm" className="rounded-xl bg-[#00E599] text-[#050505] hover:bg-[#00c584]">
                      <Link href={`/app/${orgSlug}/leads/new`}>Create lead</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary" className="rounded-xl bg-white/[0.03] text-white hover:bg-white/[0.06]">
                      <Link href={`/app/${orgSlug}/inbox`}>Open inbox</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Stage list */}
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
            <CardHeader className="border-b border-white/[0.04] pb-4">
              <CardTitle className="text-base">Operational Pipeline Stages</CardTitle>
              <CardDescription className="text-xs">
                Active real-time conversion tracks.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {pipeline.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 hover:border-white/[0.08] transition-all"
                >
                  <span className="font-heading font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[#00E599]" />
                    {stage.name}
                  </span>
                  <span className="font-mono text-xs text-[#00E599] font-bold">
                    {stage.probability}% Probability
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

      </div>
    </AppShell>
  );
}
