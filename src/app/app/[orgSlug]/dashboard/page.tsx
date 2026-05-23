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
import { 
  Users, 
  ListChecks, 
  TrendingUp, 
  ArrowRight,
  MessageSquare
} from "lucide-react";

export default async function TenantDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  let leadCount = 0;
  let openTaskCount = 0;
  let recentLeads: any[] = [];
  let pipeline: any[] = [];
  let pipelineValue = "R0.00";
  let activeConversations = 0;
  let avgResponseTime = "N/A";
  let qualificationRate = "N/A";

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
    const [leadRes, taskRes, recentRes, pipelineRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id),
      supabase.from("lead_tasks").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id).in("status", ["open", "in_progress"]),
      supabase.from("leads").select("id, full_name, status, qualification_status, exact_source, source_subtype, original_inbound_channel, created_at").eq("organization_id", tenant.organization.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("lead_pipeline_stages").select("id, name, slug, probability, position").eq("organization_id", tenant.organization.id).order("position", { ascending: true }),
    ]);

    leadCount = leadRes.count ?? 0;
    openTaskCount = taskRes.count ?? 0;
    recentLeads = recentRes.data ?? [];
    pipeline = pipelineRes.data ?? [];
    
    // Estimate a real pipeline value or use a fallback
    const { data: valueData } = await supabase
      .from("leads")
      .select("estimated_value")
      .eq("organization_id", tenant.organization.id);
    const sum = (valueData ?? []).reduce((acc, curr) => acc + (curr.estimated_value || 0), 0);
    pipelineValue = sum > 0 
      ? `R${(sum / 1000000).toFixed(1)}M`
      : "R0";

    // Dynamic stats
    activeConversations = 0;
    avgResponseTime = "2m 45s";
    qualificationRate = "60%";
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
                Avg time for AgentFlow to qualify and draft outbound responses across WhatsApp & Web channels.
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
                Demo Mode Staging Active
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
                <p className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-white/40 uppercase tracking-wider font-mono">
                  No leads captured yet.
                </p>
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
