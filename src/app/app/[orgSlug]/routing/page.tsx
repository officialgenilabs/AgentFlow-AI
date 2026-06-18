import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignalOrchestrationFlow } from "@/components/dashboard/signal-orchestration-flow";
import { RoutingAuditTrail } from "@/components/dashboard/routing-audit-trail";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { getTenantRoutingAuditTrail, getTenantSignalOrchestrationSteps } from "@/lib/data/dashboard-intelligence";
import { CheckCircle2, GitBranch, ShieldCheck } from "lucide-react";

const productionPolicies = [
  {
    title: "Tenant-backed identity resolution",
    description: "Routing evidence is scoped to the authenticated tenant and resolved through existing lead, conversation, and message records.",
    evidence: "leads, conversations, messages",
    tone: "safe",
  },
  {
    title: "Human approval before outbound",
    description: "Draft responses remain governed approval records. This surface does not dispatch WhatsApp, Evolution, or Property24 actions.",
    evidence: "ai_message_drafts, audit_logs, automation_events",
    tone: "hold",
  },
  {
    title: "Source attribution preserved",
    description: "Lead source, channel, and captured timing stay visible without inventing routing outcomes or synthetic operational volume.",
    evidence: "lead source fields + lead_events",
    tone: "safe",
  },
  {
    title: "Viewing readiness is computed",
    description: "Viewing readiness is derived from current lead, task, stage, and inbound message evidence; no booking confirmations are shown unless real records exist.",
    evidence: "lead_tasks + inbound messages",
    tone: "system",
  },
];

export default async function RoutingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);
  const [signalSteps, auditEntries] = await Promise.all([
    getTenantSignalOrchestrationSteps(tenant.organization.id),
    getTenantRoutingAuditTrail(tenant.organization.id, 8),
  ]);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-[#00E599]" />
            Routing Flow
          </h1>
          <p className="text-sm text-[#888888]">
            Evidence-backed production routing posture from captured tenant signal to governed operator action.
          </p>
        </div>

        <SignalOrchestrationFlow
          title="Production Signal Orchestration"
          description="Live tenant-backed signal counts from AgentFlow tables. Empty values mean no records exist yet, not hidden demo volume."
          steps={signalSteps}
          mode="tenant"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {productionPolicies.map((policy) => (
            <Card key={policy.title} className="border-white/[0.06] bg-[#111111]/80 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CheckCircle2 className={policy.tone === "hold" ? "mt-0.5 h-5 w-5 shrink-0 text-amber-400" : "mt-0.5 h-5 w-5 shrink-0 text-[#00E599]"} />
                  <Badge variant={policy.tone === "hold" ? "hold" : "mint"}>Policy</Badge>
                </div>
                <CardTitle className="mt-2 text-sm font-heading font-extrabold text-white">{policy.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed text-[#888888]">{policy.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">
                  Evidence Source: <span className="text-white/55">{policy.evidence}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <RoutingAuditTrail
          entries={auditEntries}
          title="Production Routing Audit Trail"
          description="Newest real automation, lead, and audit ledger events available for this tenant. Static demo examples are not shown here."
          emptyState="No tenant routing evidence has been written yet. This page remains empty rather than presenting illustrative events as live activity."
        />

        <Card className="border-[#6C63FF]/15 bg-[#6C63FF]/[0.035]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-heading font-extrabold text-white">
              <ShieldCheck className="size-4 text-[#A29EFF]" /> Truthfulness Guardrail
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed text-white/50">
              This production routing surface intentionally avoids fake lead counts, synthetic routing logs, mock bookings, and demo-safe constants. If the tenant has no first inbound records yet, the interface shows zero or an explicit empty evidence state.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
