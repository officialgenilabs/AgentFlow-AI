import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadDetail } from "@/lib/data/crm";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Vertical Chronological Event Ledger</CardTitle>
              <CardDescription className="text-xs text-[#888888]">Audit trail of ingress, verification, and automated outreach triggers.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6 relative border-l border-white/[0.08] ml-4 pl-6">
              {events.map((ev, i) => (
                <div key={ev.id || i} className="relative">
                  <span className="absolute -left-[29px] top-1 size-2.5 rounded-full bg-[#00E599]" />
                  <h4 className="text-xs font-bold text-white uppercase">{ev.event_type}</h4>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                    Field changed: <span className="font-mono text-white/70">{ev.field_name}</span> to <span className="font-mono text-[#00E599]">{ev.new_value as string}</span>.
                  </p>
                  <p className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest mt-1">
                    {new Date(ev.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
