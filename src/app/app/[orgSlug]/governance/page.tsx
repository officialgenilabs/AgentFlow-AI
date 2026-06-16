import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { Lock, Activity, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function GovernancePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  const safeguards = [
    {
      id: "sg-1",
      name: "Outbound Gate Lock",
      status: "locked",
      desc: "Requires explicit broker or admin approval before dispatching outbound SMS/WhatsApp to leads when confidence falls below 95%.",
      severity: "critical"
    },
    {
      id: "sg-2",
      name: "Automatic PII Redaction Filter",
      status: "active",
      desc: "Locally scans incoming text and redacts South African national ID numbers, physical residence keys, and primary bank cards.",
      severity: "high"
    },
    {
      id: "sg-3",
      name: "Ingress Verification Check",
      status: "active",
      desc: "Validates all property webhooks against public registry formats before appending to database records.",
      severity: "medium"
    }
  ];

  const audits = [
    { time: "02:15:32", node: "PII Redactor", lead: "Sarah Smith", action: "Masked SA ID number (740523****081) from WhatsApp thread", state: "governed" },
    { time: "01:54:12", node: "Confidence Evaluator", lead: "Thandi Mokoena", action: "Outbound draft held for review: confidence (89%) below approval ceiling (95%)", state: "flagged" },
    { time: "00:32:05", node: "Identity Matcher", lead: "Johan de Wet", action: "Ingress request compiled, normalized phone key +27829910022", state: "verified" }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#6C63FF]" />
            Compliance Settings
          </h1>
          <p className="text-sm text-[#888888]">
            Review compliance boundaries, PII redaction posture, and approval-gated outbound queues.
          </p>
        </div>

        {/* Dynamic Safeguard Summary Grid */}
        <div className="grid gap-5 md:grid-cols-3">
          {safeguards.map((sg) => (
            <Card key={sg.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl hover:border-white/[0.12] transition-all relative overflow-hidden flex flex-col justify-between">
              <div className={`absolute top-0 left-0 right-0 h-[2px] ${
                sg.status === "locked" ? "bg-[#6C63FF]" : "bg-[#00E599]"
              }`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#888888] uppercase tracking-wider">{sg.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                    sg.status === "locked"
                      ? "bg-[#6C63FF]/10 text-[#6C63FF] border-[#6C63FF]/20"
                      : "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20"
                  }`}>
                    {sg.status}
                  </span>
                </div>
                <CardDescription className="text-xs text-[#888888] mt-3 leading-relaxed">
                  {sg.desc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5 border-t border-white/[0.04] mt-4">
                <div className="flex items-center justify-between text-xs text-[#888888] pt-4">
                  <span>Enforcement Level:</span>
                  <span className="font-semibold text-white uppercase tracking-wider">{sg.severity}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings / Controls */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#FAFAFA]">Rollout Ceiling Controls</CardTitle>
              <CardDescription className="text-[#888888] text-xs">Calibrate auto-dispatch parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
                  <span>Minimum Auto-Send Confidence</span>
                  <span className="text-white font-bold font-mono">95%</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6C63FF] rounded-full" style={{ width: "95%" }} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Live Ingress Safety Hook</span>
                  <span className="text-[#00E599] font-bold font-sans">NOMINAL</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Outbound Rate-Limiter (hourly)</span>
                  <span className="text-white font-mono">50 / node</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">System Emergency Breaker</span>
                  <span className="text-red-400 font-bold font-sans flex items-center gap-1 cursor-pointer">
                    <ShieldAlert className="h-4 w-4" />
                    TRIGGER CUTOFF
                  </span>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <Button className="w-full bg-[#6C63FF] text-white hover:bg-[#6C63FF]/90 font-semibold rounded-xl">
                  Update Safety Ceilings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Governance Audits Ledger */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/[0.06]">
              <div>
                <CardTitle className="text-base font-bold text-[#FAFAFA]">Security Audit Trail</CardTitle>
                <CardDescription className="text-[#888888] text-xs">Ledger of real-time filters and override events.</CardDescription>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#888888] font-semibold bg-white/[0.04] px-2.5 py-1 rounded-full uppercase">
                <Activity className="h-3 w-3 text-[#6C63FF] animate-pulse" />
                Auditor Node Listening
              </span>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {audits.map((aud, idx) => (
                <div key={idx} className="flex gap-4 p-3 rounded-lg bg-[#161616]/40 border border-white/[0.04] text-xs items-center hover:bg-[#1A1A1A]/60 transition-colors">
                  <span className="font-mono text-[#888888] shrink-0">{aud.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200">
                      <span className="font-semibold text-white">[{aud.node}]</span>
                      <span className="mx-2 text-[#888888]">•</span>
                      <span>{aud.action}</span>
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    aud.state === "governed" ? "bg-[#00E599]/10 text-[#00E599]" :
                    aud.state === "flagged" ? "bg-amber-500/10 text-amber-400" :
                    "bg-[#6C63FF]/10 text-[#6C63FF]"
                  }`}>
                    {aud.state}
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
