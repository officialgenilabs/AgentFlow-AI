import Link from "next/link";
import { Plus, User, Layers, Calendar, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayMember, getLeadList } from "@/lib/data/crm";
import { Badge } from "@/components/ui/badge";

export default async function LeadsPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const { tenant, leads, members, stages } = await getLeadList(orgSlug);
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#00E599] uppercase">
            OPERATIONAL LEDGER
          </span>
          <h2 className="text-3xl font-heading font-extrabold text-white mt-1">Leads Registry</h2>
          <p className="mt-2 text-xs text-white/50 leading-relaxed uppercase tracking-wider">
            Traceable lead attribution, identity matching, and pipeline tracking.
          </p>
        </div>
        <Button asChild className="bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl shadow-[0_0_15px_rgba(0,229,153,0.1)]">
          <Link href={`/app/${orgSlug}/leads/new`}>
            <Plus className="size-4 mr-1.5" /> New Lead
          </Link>
        </Button>
      </div>

      {query.error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-400 font-mono">
          SYSTEM ERROR: {query.error}
        </div>
      ) : null}

      <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
        <CardHeader className="border-b border-white/[0.04] pb-4">
          <CardTitle className="text-sm">Traceable Pipeline Leads</CardTitle>
          <CardDescription className="text-xs">
            {leads.length} active CRM records across {stages.length} pipeline stages.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center flex flex-col items-center justify-center">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider">No leads in registry</p>
              <p className="mt-2 text-[10px] text-white/40 leading-relaxed uppercase max-w-xs">
                Create your first traceable lead before inbox or conversational automation pipelines come online.
              </p>
            </div>
          ) : leads.map((lead) => {
            const stage = lead.pipeline_stage_id ? stageById.get(lead.pipeline_stage_id) : null;
            return (
              <Link
                key={lead.id}
                href={`/app/${orgSlug}/leads/${lead.id}`}
                className="block rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] p-5 hover:border-white/[0.08] transition-all duration-200"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading font-extrabold text-sm text-white uppercase tracking-wide">
                        {lead.full_name}
                      </h3>
                      <Badge variant="neutral">
                        {lead.status}
                      </Badge>
                      <Badge variant={lead.qualification_status === "ai_qualified" || lead.qualification_status === "human_qualified" ? "mint" : "warning"}>
                        {lead.qualification_status}
                      </Badge>
                      {lead.priority && (
                        <Badge variant={lead.priority === "urgent" ? "error" : lead.priority === "high" ? "warning" : "neutral"}>
                          {lead.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/60 font-medium">
                      {lead.email || lead.phone || lead.company || "No contact detail captured"}
                    </p>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider leading-none">
                      Identity Confidence: <span className="text-white/50">{lead.identity_confidence || "phone_email"}</span>
                      {lead.normalized_phone_e164 || lead.normalized_email ? ` • ${lead.normalized_phone_e164 || lead.normalized_email}` : ""}
                    </p>
                    <div className="pt-2 border-t border-white/[0.03] flex items-center gap-2 text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                      <span>Source: {lead.exact_source}</span>
                      <span>•</span>
                      <span>Subtype: {lead.source_subtype}</span>
                      <span>•</span>
                      <span>Channel: {lead.original_inbound_channel}</span>
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs text-white/70 sm:grid-cols-3 lg:min-w-[480px]">
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 flex flex-col justify-between">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase flex items-center gap-1">
                        <Layers className="size-3 text-[#00E599]" /> Stage
                      </span>
                      <span className="font-bold text-white uppercase mt-1">
                        {stage?.name ?? "Unstaged"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 flex flex-col justify-between">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase flex items-center gap-1">
                        <User className="size-3 text-[#6C63FF]" /> Owner
                      </span>
                      <span className="font-bold text-white mt-1 truncate">
                        {displayMember(members, lead.assigned_owner_user_id)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 flex flex-col justify-between">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase flex items-center gap-1">
                        <Calendar className="size-3 text-white/30" /> Ingestion
                      </span>
                      <span className="font-bold text-white/80 mt-1">
                        {new Date(lead.captured_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </AppShell>
  );
}
