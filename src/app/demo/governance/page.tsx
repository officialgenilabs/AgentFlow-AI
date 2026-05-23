import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { Lock, CheckCircle, Octagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DemoGovernancePage() {
  const orgSlug = "boutique-properties";
  const tenant = await resolveTenantBySlug(orgSlug, true);

  const safeguards = [
    { id: "sg-1", label: "Multi-tenant strict logical schema isolation verified", checked: true },
    { id: "sg-2", label: "Outbound throttling thresholds active (< 60 messages/hr/node)", checked: true },
    { id: "sg-3", label: "PII redaction engine active for outbound channels", checked: true },
    { id: "sg-4", label: "Human-in-the-loop manual override override enabled", checked: true },
    { id: "sg-5", label: "Ingress security validation: CSRF + rate limiting", checked: true }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#6C63FF]" />
            Governance Safeguard Panel
          </h1>
          <p className="text-sm text-[#888888]">
            Enforce compliance boundaries, PII redactions, and manual override constraints on autonomous dispatchers.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Outbound locks status */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-1 flex flex-col justify-between">
            <CardHeader>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#6C63FF] uppercase">Breaker Gate</span>
              <CardTitle className="text-lg font-bold text-white mt-2">Emergency Breaker Switch</CardTitle>
              <CardDescription className="text-xs text-[#888888]">
                Instantly disconnect and freeze all automated WhatsApp and email outbound dispatches across this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 border-t border-white/[0.04] mt-4">
              <button className="w-full py-3 px-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all">
                <Octagon className="h-4 w-4 shrink-0" />
                Activate Emergency Shutdown
              </button>
            </CardContent>
          </Card>

          {/* Compliance Checklist */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Ingress Safeguards Checklist</CardTitle>
              <CardDescription className="text-xs text-[#888888]">Active regulatory assertions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeguards.map((sg) => (
                <div key={sg.id} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/80">{sg.label}</span>
                  <Badge variant="mint">
                    <CheckCircle className="h-3 w-3 mr-1" /> Enforced
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
