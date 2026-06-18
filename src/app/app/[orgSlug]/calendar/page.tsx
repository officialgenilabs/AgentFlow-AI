import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type ViewingEvidence = {
  id: string;
  property: string;
  lead: string;
  time: string;
  broker: string;
  status: "confirmed" | "pending" | string;
};

const viewings: ViewingEvidence[] = [];
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name) => ({
  name,
  date: "Pending",
  active: false,
  viewingsCount: 0,
}));

export default async function CalendarPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-[#00E599]" />
              Property Viewings Calendar
            </h1>
            <p className="text-sm text-[#888888]">
              Production viewing evidence appears here only after real scheduling records exist. Calendar automation is not presented as active without proof.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled variant="outline" className="border-white/[0.08] text-white/40 rounded-xl flex items-center gap-1.5" size="sm">
              <ChevronLeft className="h-4 w-4" />
              Prev Week
            </Button>
            <Button disabled variant="outline" className="border-white/[0.08] text-white/40 rounded-xl flex items-center gap-1.5" size="sm">
              Next Week
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button disabled className="bg-white/[0.04] text-white/40 font-semibold rounded-xl" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Scheduling Not Activated
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => (
            <Card key={day.name} className="bg-[#111111]/80 backdrop-blur-xl border-white/[0.06] text-center p-4">
              <p className="text-xs text-[#888888] font-bold uppercase tracking-wider">{day.name}</p>
              <p className="text-lg font-mono font-bold text-white/45 mt-1">{day.date}</p>
              <p className="mt-3 text-[10px] text-[#888888] font-mono">NO EVIDENCE</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-2">
            <CardHeader className="border-b border-white/[0.06] pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-[#FAFAFA]">Scheduled Viewings Evidence</CardTitle>
                  <CardDescription className="text-[#888888] text-xs">
                    Real viewing records only. No synthetic clients, properties, or booking confirmations are rendered.
                  </CardDescription>
                </div>
                <Badge variant="neutral">{viewings.length} Records</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {viewings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
                  <p className="text-xs font-heading font-extrabold uppercase tracking-wider text-white/60">
                    No production viewing schedule records yet
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-[10px] font-mono font-bold uppercase tracking-widest leading-relaxed text-white/35">
                    This surface stays empty until AgentFlow has a real tenant-backed scheduling table or verified booking evidence.
                  </p>
                </div>
              ) : (
                viewings.map((viewing) => (
                  <div key={viewing.id} className="rounded-xl border border-white/[0.06] bg-[#161616]/40 p-5">
                    <p className="font-bold text-[#FAFAFA] text-base">{viewing.property}</p>
                    <p className="mt-2 text-xs text-[#888888]">{viewing.lead} · {viewing.time} · {viewing.broker}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#FAFAFA]">Calendar Integration Status</CardTitle>
              <CardDescription className="text-[#888888] text-xs">Truthful production activation state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1A1A1A]/40 border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Google Workspace Sync</span>
                  <span className="text-white/45 font-bold uppercase tracking-wider">Not Connected</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Agent Availability Mapping</span>
                  <span className="text-white/45 font-bold uppercase tracking-wider">Not Active</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">WhatsApp Booking Triggers</span>
                  <span className="text-white/45 font-bold uppercase tracking-wider">Disabled</span>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#888888] mb-2">
                  <ShieldCheck className="h-4 w-4 text-[#A29EFF]" /> Truthfulness Guardrail
                </p>
                <p className="text-xs text-[#888888] leading-relaxed">
                  AgentFlow does not currently claim autonomous viewing confirmations in production. Any future schedule state must be backed by real tenant records before appearing here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
