import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayMember, getLeadList } from "@/lib/data/crm";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "urgent": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "high": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "medium": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

export default async function AgentLeadViewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { tenant, leads, members } = await getLeadList(orgSlug);
  const myLeads = leads.filter((lead) => lead.assigned_owner_user_id === tenant.profile.id);
  const visibleLeads = myLeads.length ? myLeads : leads;

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            Conversion Focus List
            <StatusIndicator status="active" />
          </h1>
          <p className="text-sm text-[#888888]">
            Agent-first view for assigned leads. Showing the active pipeline for direct outreach priority.
          </p>
        </div>

        <section className="grid gap-5 md:grid-cols-3">
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-[#FAFAFA] font-mono">{myLeads.length}</CardTitle>
              <CardDescription className="text-xs uppercase tracking-wider text-[#888888]">Assigned directly to you</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-[#00E599] font-mono">
                {leads.filter((lead) => lead.status === "new").length}
              </CardTitle>
              <CardDescription className="text-xs uppercase tracking-wider text-[#888888]">Unassigned Intake Queue</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-[#6C63FF] font-mono">
                {leads.filter((lead) => ["ai_qualified", "human_qualified"].includes(lead.qualification_status)).length}
              </CardTitle>
              <CardDescription className="text-xs uppercase tracking-wider text-[#888888]">Qualified Pipeline Leads</CardDescription>
            </CardHeader>
          </Card>
        </section>

        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.06] pb-5">
            <CardTitle className="text-lg font-bold text-[#FAFAFA]">Next Best Lead Queue</CardTitle>
            <CardDescription className="text-[#888888] mt-1">
              Prioritized dynamically by capture recency and autonomous priority ranking.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {visibleLeads.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center text-sm text-[#888888]">
                No leads ready for agent view.
              </div>
            ) : (
              visibleLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/app/${orgSlug}/leads/${lead.id}`}
                  className="block rounded-xl border border-white/[0.06] bg-[#161616]/40 p-5 hover:bg-[#1A1A1A]/80 transition-all duration-200 group"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-[#FAFAFA] group-hover:text-[#00E599] transition-colors text-base">{lead.full_name}</p>
                      <p className="text-xs text-[#888888] flex flex-wrap gap-2 items-center">
                        <span className="font-semibold text-[#FAFAFA]">{lead.exact_source}</span>
                        <span>•</span>
                        <span>{lead.source_subtype}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] bg-white/[0.04] px-1.5 py-0.5 rounded text-[#FAFAFA]">{lead.original_inbound_channel}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right hidden sm:block">
                        <p className="font-medium text-[#FAFAFA]">{displayMember(members, lead.assigned_owner_user_id)}</p>
                        <p className="text-[10px] text-[#888888] uppercase tracking-wider">Assigned Agent</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getPriorityColor(lead.priority)}`}>
                        {lead.priority}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
