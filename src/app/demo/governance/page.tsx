import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { Lock, CheckCircle, Octagon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TrustLedger, TrustLedgerEntry } from "@/components/ui/evidence";

const DEMO_GOVERNANCE_BASE_TIME = 1781524800000;

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

  const auditLogs: TrustLedgerEntry[] = [
    {
      timestamp: new Date(DEMO_GOVERNANCE_BASE_TIME - 5 * 60 * 1000).toISOString(), // 5m ago
      event: "Compliance Hold: Flagged by rule [SG-8: Outbound Governance] for Sarah Jenkins. Solar backup battery details require manual validation.",
      actor: "Governance Guard",
      status: "hold"
    },
    {
      timestamp: new Date(DEMO_GOVERNANCE_BASE_TIME - 12 * 60 * 1000).toISOString(), // 12m ago
      event: "Security Block: Flagged by rule [SG-3: Identity Match] for David Pieterse. Outbound secondary email differs from primary CRM record.",
      actor: "PII Shield Node",
      status: "blocked"
    },
    {
      timestamp: new Date(DEMO_GOVERNANCE_BASE_TIME - 2 * 3600 * 1000).toISOString(), // 2h ago
      event: "Staged Response Verified: Outbound simulation message approved for Sibusiso Ndlovu. Saturday viewing slots locked.",
      actor: "Operator (Lead Architect)",
      status: "verified"
    },
    {
      timestamp: new Date(DEMO_GOVERNANCE_BASE_TIME - 4 * 3600 * 1000).toISOString(), // 4h ago
      event: "Channel Verification Active: Secured inbound Property24 WhatsApp channel connection. Port integrity check completed.",
      actor: "System Ingress Guard",
      status: "system"
    }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-7xl mx-auto space-y-6 select-none text-left">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#6C63FF]" />
            Compliance Settings
          </h1>
          <p className="text-sm text-[#888888]">
            Review demo-safe compliance boundaries, PII redactions, and manual override constraints for governed communication flows.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Outbound locks status */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-1 flex flex-col justify-between shadow-xl">
            <CardHeader>
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#6C63FF] uppercase">Breaker Gate</span>
              <CardTitle className="text-lg font-heading font-extrabold text-white mt-2">Emergency Breaker Switch</CardTitle>
              <CardDescription className="text-xs text-[#888888]">
                Instantly disconnect and freeze all demo WhatsApp and email outbound dispatches across this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 border-t border-white/[0.04] mt-4">
              <button className="w-full py-3 px-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 transition-all">
                <Octagon className="h-4 w-4 shrink-0" />
                Activate Emergency Shutdown
              </button>
            </CardContent>
          </Card>

          {/* Compliance Checklist */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-2 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading font-extrabold text-white">Active Regulatory Guard Checklist</CardTitle>
              <CardDescription className="text-xs text-[#888888]">Demo-safe assertions governing automated lead interactions.</CardDescription>
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

        {/* Dynamic TrustLedger Audit Trail Card */}
        <TrustLedger
          entries={auditLogs}
          title="Compliance Audit Trail"
          description="High-integrity system event log tracking signal ingress, security scans, and manual approval gates."
        />
      </div>
    </AppShell>
  );
}