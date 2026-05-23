import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadDetail } from "@/lib/data/crm";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DemoLeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const orgSlug = "boutique-properties";
  const { tenant, lead, events } = await getLeadDetail(orgSlug, leadId, true);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/demo/leads" className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] text-white/70 hover:text-white transition-all">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
              {lead.full_name} // Lead Memory
            </h1>
            <p className="text-sm text-[#888888]">
              Exhaustive chronological events, communication ledgers, and priority tracking logs.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Metadata Card */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                <p className="text-[10px] font-mono text-white/40 uppercase">Email</p>
                <p className="font-bold text-white mt-1 break-all">{lead.email}</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                <p className="text-[10px] font-mono text-white/40 uppercase">Phone</p>
                <p className="font-bold text-white mt-1">{lead.phone}</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                <p className="text-[10px] font-mono text-white/40 uppercase">Exact Inbound Source</p>
                <p className="font-bold text-white mt-1">{lead.exact_source}</p>
              </div>
            </CardContent>
          </Card>

          {/* Chronological Vertical Timeline Events */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading font-extrabold text-white">Governed Operational Incident Ledger</CardTitle>
              <CardDescription className="text-xs text-[#888888]">Audit trail proving data ingress, security checks, and manual approval gates.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6 relative border-l border-white/[0.08] ml-4 pl-6 select-none">
              {events.map((ev, i) => {
                // Get custom descriptive text based on event type
                let title = ev.event_type.replace(/_/g, " ").toUpperCase();
                let desc = `Field modified: ${ev.field_name} to "${ev.new_value}".`;
                let dotColor = "bg-[#6C63FF]"; // Default system state purple
                let textColor = "text-white/60";

                if (ev.event_type === "capture") {
                  title = "Ingress Signal Captured";
                  desc = "Lead captured via Property24 Integration (WhatsApp Node Ingress). Primary search criteria logged.";
                  dotColor = "bg-[#6C63FF]";
                } else if (ev.event_type === "identity_resolve") {
                  title = "Identity Resolved";
                  desc = `Matched profile via Gen I Labs Identity Engine (Match Rate: ${(ev.metadata as any)?.match_rate * 100 || 99}%). Linked database profiles: "${(ev.metadata as any)?.matches?.join(", ") || "Phone/Email matches"}".`;
                  dotColor = "bg-[#00E599]"; // green
                } else if (ev.event_type === "qualification_check") {
                  title = "Audited Qualification Check";
                  desc = (ev.metadata as any)?.reasoning || desc;
                  dotColor = "bg-[#00E599]";
                } else if (ev.event_type === "solar_concern_flagged") {
                  title = "Compliance Concern Flagged";
                  desc = "Automatic safety scan detected load-shedding backup battery query. Triggered inventory check protocol.";
                  dotColor = "bg-amber-500 font-bold"; // amber
                } else if (ev.event_type === "operator_task_created") {
                  title = "Manual Operator Action Needed";
                  desc = `Operator follow-up created: "${ev.new_value}". Assigned to: ${(ev.metadata as any)?.assigned_to || "Lead Architect"}. State: pending verification.`;
                  dotColor = "bg-amber-500 font-bold";
                } else if (ev.event_type === "ai_draft_generated") {
                  title = "Staged Response Draft";
                  desc = `Staged outbound response draft generated with ${(ev.metadata as any)?.confidence || "94%"} accuracy intent matching property record details.`;
                  dotColor = "bg-[#6C63FF]";
                } else if (ev.event_type === "governance_hold") {
                  title = "Staging Compliance Hold";
                  desc = `Staged response locked by rule [SG-8: Outbound Staging]. Awaiting explicit human-in-the-loop operator verification before dispatch.`;
                  dotColor = "bg-[#6C63FF]";
                }

                const isAttention = ev.event_type === "solar_concern_flagged" || ev.event_type === "operator_task_created";

                return (
                  <div key={ev.id || i} className="relative space-y-1">
                    {/* Pulsing dot only on unresolved operator attention */}
                    <div className="absolute -left-[33px] top-1 flex items-center justify-center w-4 h-4">
                      {isAttention && (
                        <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-amber-500" style={{ animationDuration: "1.8s" }} />
                      )}
                      <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", dotColor)} />
                    </div>
                    
                    <h4 className="text-xs font-heading font-extrabold text-white tracking-wider uppercase flex items-center gap-2">
                      {title}
                    </h4>
                    <p className="text-[11px] leading-relaxed text-white/50 font-medium">
                      {desc}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest pt-0.5">
                      <span>{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span>â€¢</span>
                      <span>Actor: {ev.actor_user_id ? "Operator" : "System Guard"}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
