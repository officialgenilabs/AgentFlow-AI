import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { GitBranch, Activity, Zap, CheckCircle2 } from "lucide-react";

export default async function RoutingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  const stages = [
    {
      id: "capture",
      title: "1. Capture",
      desc: "Ingress gateways normalizing incoming signal.",
      stats: "47 Ingested",
      activeGates: ["WhatsApp Ingress", "Property24 API", "Website Webhook"],
      status: "nominal"
    },
    {
      id: "qualify",
      title: "2. Qualify",
      desc: "Autonomous entity extraction & budget match.",
      stats: "32 Decided",
      activeGates: ["Budget Matcher", "Intent Parser", "Identity Verification"],
      status: "nominal"
    },
    {
      id: "route",
      title: "3. Route",
      desc: "Route qualified signals to the appropriate operational cluster.",
      stats: "28 Routed",
      activeGates: ["Sandton Broker Matcher", "Priority Dispatcher"],
      status: "nominal"
    },
    {
      id: "govern",
      title: "4. Govern",
      desc: "Strict safety filters and manual override loops.",
      stats: "2 Staged",
      activeGates: ["Outbound lock (95%)", "PII Redaction"],
      status: "active"
    },
    {
      id: "schedule",
      title: "5. Schedule",
      desc: "Instant viewing booking & slot reservations.",
      stats: "18 Confirmed",
      activeGates: ["Calendar Syncer", "Instant Tour Booking"],
      status: "nominal"
    }
  ];

  const logs = [
    { time: "01:42:09", lead: "Thandi Mokoena", event: "Matched with Sandton Brokerage Node via Budget Criteria (R4.5M)", status: "routed" },
    { time: "01:28:44", lead: "Johan de Wet", event: "PII Filter Redacted South African ID number from WhatsApp body", status: "governed" },
    { time: "01:05:12", lead: "Sarah Smith", event: "Instant viewing booked for 14 Camps Bay Dr at 14:00 Monday", status: "scheduled" },
    { time: "00:54:33", lead: "Naledi Dlamini", event: "Ingress captured via Property24 parser hook. Lead duplicated matching ID keys", status: "captured" }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-[#00E599]" />
            Routing Flow
          </h1>
          <p className="text-sm text-[#888888]">
            Visualize governed signal propagation from raw message capture to agent delegation and viewing coordination.
          </p>
        </div>

        {/* Dynamic Connected Flowchart */}
        <div className="grid gap-4 lg:grid-cols-5 md:grid-cols-3 grid-cols-1 relative">
          {stages.map((stage) => (
            <Card key={stage.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl hover:border-white/[0.12] transition-all relative overflow-hidden flex flex-col justify-between">
              {stage.status === "active" && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#6C63FF] animate-pulse" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#888888] uppercase tracking-wider">{stage.title}</span>
                  <span className={`w-2 h-2 rounded-full ${stage.status === "active" ? "bg-[#6C63FF] animate-pulse" : "bg-[#00E599] animate-pulse"}`} />
                </div>
                <CardTitle className="text-lg font-bold text-[#FAFAFA] mt-2 font-mono">{stage.stats}</CardTitle>
                <CardDescription className="text-xs text-[#888888] mt-1 leading-relaxed">{stage.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5">
                <div className="space-y-1.5 border-t border-white/[0.04] pt-4 mt-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#888888] mb-2">Active Gates</p>
                  {stage.activeGates.map((gate, gIdx) => (
                    <div key={gIdx} className="flex items-center gap-1.5 text-xs text-[#E5E5E5] font-sans">
                      <Zap className="h-3 w-3 text-[#00E599] shrink-0" />
                      <span>{gate}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Constraints */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#FAFAFA]">Active Pipeline Policies</CardTitle>
              <CardDescription className="text-[#888888] text-xs">Governed routing parameters enforced.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1A1A1A]/40 border border-white/[0.06] flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#00E599] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#FAFAFA]">Cryptographic Identity Keying</p>
                  <p className="text-[10px] text-[#888888] mt-0.5 leading-relaxed">Unique parsing and matching on email and phone keys to prevent multi-agent collision.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1A1A1A]/40 border border-white/[0.06] flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#00E599] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#FAFAFA]">Manual Approval Override Gateway</p>
                  <p className="text-[10px] text-[#888888] mt-0.5 leading-relaxed">Outbound messages below 95% threshold are auto-routed to AI Approval queue.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#1A1A1A]/40 border border-white/[0.06] flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#6C63FF] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#FAFAFA]">Capetown Geographic Allocator</p>
                  <p className="text-[10px] text-[#888888] mt-0.5 leading-relaxed">Subdomain routing enabled for boutique Camps Bay properties to Camps Bay brokerage node.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Routing Audit Trail */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/[0.06]">
              <div>
                <CardTitle className="text-base font-bold text-[#FAFAFA]">Live Routing Audit trail</CardTitle>
                <CardDescription className="text-[#888888] text-xs">Realtime ledger of lead processing events.</CardDescription>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#888888] font-semibold bg-white/[0.04] px-2.5 py-1 rounded-full uppercase">
                <Activity className="h-3 w-3 text-[#00E599] animate-pulse" />
                System Listening
              </span>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-4 p-3 rounded-lg bg-[#161616]/40 border border-white/[0.04] text-xs items-center hover:bg-[#1A1A1A]/60 transition-colors">
                  <span className="font-mono text-[#888888] shrink-0">{log.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200">
                      <span className="font-semibold text-white">{log.lead}</span>
                      <span className="mx-2 text-[#888888]">•</span>
                      <span>{log.event}</span>
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    log.status === "scheduled" ? "bg-[#00E599]/10 text-[#00E599]" :
                    log.status === "governed" ? "bg-[#6C63FF]/10 text-[#6C63FF]" :
                    "bg-[#888888]/10 text-[#E5E5E5]"
                  }`}>
                    {log.status}
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
