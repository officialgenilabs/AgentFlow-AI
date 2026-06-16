import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadList } from "@/lib/data/crm";
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

export default async function DemoDashboardPage() {
  const orgSlug = "boutique-properties";
  const { tenant, leads, members, stages } = await getLeadList(orgSlug, true);

  const leadCount = leads.length;
  const openTaskCount = 2; // static seeded open tasks
  const recentLeads = leads;
  const pipeline = stages;
  const pipelineValue = "R8.2M";
  const activeConversations = 12;
  const avgResponseTime = "2m 34s";
  const qualificationRate = "68%";

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="space-y-6">
        
        {/* KPI Overview Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Simulated Leads"
            value={leadCount}
            description="Active lead incidents in simulation"
            icon={<Users className="size-4 text-[#A29EFF]" />}
          />
          <MetricCard
            title="Portfolio Volume"
            value={pipelineValue}
            description="Staged value under operational audit"
            glow={false}
            icon={<TrendingUp className="size-4 text-[#00E599]" />}
          />
          <MetricCard
            title="Governed Channels"
            value={activeConversations}
            description="Simulated conversation loops"
            icon={<MessageSquare className="size-4 text-[#6C63FF]" />}
          />
          <MetricCard
            title="Operator Tasks"
            value={openTaskCount}
            description="Pending manual battery validations"
            icon={<ListChecks className="size-4 text-amber-500" />}
          />
        </div>

        {/* Operational Efficiency Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-[#00E599] rounded-full blur-[80px] opacity-5 pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                STAGE GATE LATENCY
              </span>
              <CardTitle className="text-lg font-heading font-extrabold mt-1 text-white">
                Staged Response Speed: {avgResponseTime}
              </CardTitle>
              <CardDescription className="text-xs text-white/50 leading-relaxed">
                Simulated average duration to qualify inbound signal and stage outbound drafts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 w-32 h-32 bg-[#6C63FF] rounded-full blur-[80px] opacity-5 pointer-events-none" />
            <CardHeader className="pb-2">
              <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                GOVERNED CONVERSION INDEX
              </span>
              <CardTitle className="text-lg font-heading font-extrabold mt-1 text-white">
                Staged Qualification Index: {qualificationRate}
              </CardTitle>
              <CardDescription className="text-xs text-white/50 leading-relaxed">
                Staged qualification index resolving through simulated safety and manual validation gates.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Centerpiece Interactive Console */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-at-t from-[#00E599]/[0.02] via-transparent to-transparent pointer-events-none" />
          <CardHeader className="border-b border-white/[0.04] pb-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Sovereign Command Simulator</CardTitle>
                <CardDescription className="text-xs">
                  Governed lead signal flow, validation status, and compliance parameters.
                </CardDescription>
              </div>
              <Badge variant="mint">
                <StatusIndicator status="active" className="mr-1.5" pulse={false} />
                Governed Simulator Staging Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 sm:p-8">
              <span className="text-[10px] font-mono font-bold tracking-widest text-white/30 uppercase">
                {tenant.organization.name}
              </span>
              <h2 className="mt-2 text-2xl font-heading font-extrabold text-white leading-tight">
                Traceable lead incident auditing.
              </h2>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-white/55">
                Every lead preserves exact source metadata, original capture channel, timing logs, and decision paths. Completely simulated, calm, and audited.
              </p>
              
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl">
                  <Link href={`/demo/leads/new`}>
                    Create Staged Lead <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="bg-white/[0.03] border-white/[0.06] text-white hover:bg-white/[0.06] rounded-xl">
                  <Link href={`/demo/leads`}>
                    View Staging Pipeline
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
                  href={`/demo/leads/${lead.id}`} 
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
            </CardContent>
          </Card>

          {/* Pipeline Stage list */}
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
            <CardHeader className="border-b border-white/[0.04] pb-4">
              <CardTitle className="text-base">Operational Pipeline Stages</CardTitle>
              <CardDescription className="text-xs">
                Simulated real-world transaction pipeline.
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
