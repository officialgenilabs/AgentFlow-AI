import { Clock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { getApprovalQueue } from "@/lib/data/approvals";
import { ApprovalQueueClient } from "@/features/approvals/approval-queue-client";

function resolveApprovalActionMode() {
  const transportEnabled = process.env.OUTBOUND_TRANSPORT_ENABLED === "true";
  const executionSecret = process.env.GOVERNED_OUTBOUND_EXECUTION_SECRET || process.env.OUTBOUND_EXECUTION_SECRET;

  if (transportEnabled && executionSecret) return "whatsapp" as const;
  if (process.env.OUTBOUND_MANUAL_SEND_ENABLED === "true") return "manual" as const;
  return "draft" as const;
}

function draftStatusMessage(status: string, actionMode: ReturnType<typeof resolveApprovalActionMode>) {
  if (status === "approved") {
    if (actionMode === "manual") return "Draft approved for manual operator-controlled send. No autonomous outbound dispatch was triggered.";
    if (actionMode === "whatsapp") return "Draft approved through the governed send path. Transport still requires server-side controls and audit evidence.";
    return "Draft approved. Outbound transport remains frozen and no autonomous send was triggered.";
  }

  if (status === "discarded") return "Draft discarded and governance evidence persisted.";
  return `Draft ${status} persisted. Outbound transport remains governed.`;
}

export default async function AIApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; draft?: string; sent?: string }>;
}) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const { tenant, items } = await getApprovalQueue(orgSlug);
  const actionMode = resolveApprovalActionMode();
  const totalPending = items.length;
  const avgConfidence = totalPending > 0
    ? Math.round(items.reduce((acc, item) => acc + item.confidenceScore, 0) / totalPending)
    : 0;

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Pending AI Approvals"
            value={totalPending}
            description="Responses requiring active operator verification"
            glow={totalPending > 0}
            icon={<Clock className="size-4" />}
          />
          <MetricCard
            title="Average Confidence"
            value={`${avgConfidence}%`}
            description="AI self-attribution reliability metric"
            icon={<ShieldCheck className="size-4 text-[#00E599]" />}
          />
          <MetricCard
            title="Governance Safeguard"
            value="ACTIVE"
            description="Human-in-the-loop strict staging block"
            icon={<StatusIndicator status="active" pulse={false} />}
          />
        </div>

        {query.error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-400 font-mono">
            SYSTEM ERROR: {query.error}
          </div>
        ) : null}

        {query.draft ? (
          <div className="rounded-xl border border-[#00E599]/20 bg-[#00E599]/5 px-4 py-3 text-xs font-semibold text-[#00E599] font-mono uppercase tracking-wider">
            {draftStatusMessage(query.draft, actionMode)}
          </div>
        ) : null}

        {query.sent ? (
          <div className="rounded-xl border border-[#00E599]/20 bg-[#00E599]/5 px-4 py-3 text-xs font-semibold text-[#00E599] font-mono uppercase tracking-wider">
            Approved outbound message delivered and audit evidence persisted.
          </div>
        ) : null}

        {totalPending === 0 ? (
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-[#00E599]/10 border border-[#00E599]/20 p-4 text-[#00E599] animate-pulse">
              <ShieldCheck className="size-10" />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-white">Operations Clear</h2>
            <p className="max-w-md text-xs text-white/50 leading-relaxed uppercase tracking-wider">
              Outbound queue is empty. Real draft state is synchronized from the governed message draft ledger.
            </p>
          </Card>
        ) : (
          <ApprovalQueueClient orgSlug={orgSlug} items={items} actionMode={actionMode} />
        )}
      </div>
    </AppShell>
  );
}
