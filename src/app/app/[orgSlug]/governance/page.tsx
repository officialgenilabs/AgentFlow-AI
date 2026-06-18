import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoutingAuditTrail } from "@/components/dashboard/routing-audit-trail";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { getTenantRoutingAuditTrail } from "@/lib/data/dashboard-intelligence";
import { Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const safeguards = [
  {
    id: "sg-1",
    name: "Outbound Gate Lock",
    status: "locked",
    desc: "Production outbound remains blocked unless a governed server-side approval and transport certification path explicitly enables it.",
    severity: "critical",
  },
  {
    id: "sg-2",
    name: "Manual Approval Ledger",
    status: "configured",
    desc: "Draft review state is persisted through existing approval, audit, and automation ledger records where available.",
    severity: "high",
  },
  {
    id: "sg-3",
    name: "Signed Ingress Boundary",
    status: "configured",
    desc: "Production ingress endpoints require authenticated/signed access before writing tenant records.",
    severity: "high",
  },
];

export default async function GovernancePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);
  const auditEntries = await getTenantRoutingAuditTrail(tenant.organization.id, 8);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#6C63FF]" />
            Compliance Settings
          </h1>
          <p className="text-sm text-[#888888]">
            Review production governance posture without synthetic safety events or fake operator activity.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {safeguards.map((sg) => (
            <Card key={sg.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
              <div className={sg.status === "locked" ? "absolute top-0 left-0 right-0 h-[2px] bg-[#6C63FF]" : "absolute top-0 left-0 right-0 h-[2px] bg-[#00E599]"} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-[#888888] uppercase tracking-wider">{sg.name}</span>
                  <Badge variant={sg.status === "locked" ? "context" : "mint"}>{sg.status}</Badge>
                </div>
                <CardDescription className="text-xs text-[#888888] mt-3 leading-relaxed">
                  {sg.desc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5 border-t border-white/[0.04] mt-4">
                <div className="flex items-center justify-between text-xs text-[#888888] pt-4">
                  <span>Governance Level:</span>
                  <span className="font-semibold text-white uppercase tracking-wider">{sg.severity}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#FAFAFA]">Outbound Control State</CardTitle>
              <CardDescription className="text-[#888888] text-xs">Production send path remains governance-locked.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
                  <span>Autonomous Outbound Dispatch</span>
                  <span className="text-amber-400 font-bold font-mono">DISABLED</span>
                </div>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Approval Queue Ledger</span>
                  <span className="text-[#00E599] font-bold font-sans">READABLE</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Outbound Rate-Limiter</span>
                  <span className="text-white/45 font-mono">N/A</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Emergency Breaker</span>
                  <span className="text-red-400 font-bold font-sans flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4" />
                    Manual Ops Only
                  </span>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <Button disabled className="w-full bg-white/[0.04] text-white/40 font-semibold rounded-xl">
                  Safety Ceiling Changes Locked
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <RoutingAuditTrail
              entries={auditEntries}
              title="Governance Audit Evidence"
              description="Newest real tenant automation, lead, and audit ledger records. No illustrative PII or override examples are rendered in production."
              emptyState="No governance audit evidence has been written for this tenant yet. This panel stays empty rather than showing mock compliance events."
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
