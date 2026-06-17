import Link from "next/link";
import { AlertOctagon, ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PendingApprovalSummaryItem {
  leadName: string;
  property: string;
  status: "pending" | "hold" | "blocked";
  confidence?: number;
}

interface PendingApprovalsSummaryProps {
  items: PendingApprovalSummaryItem[];
  emptyState?: string;
  href: string;
  className?: string;
  ctaLabel?: string;
  totalCount?: number;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Approval Required",
    badge: "hold" as const,
    text: "text-amber-400",
    bg: "bg-amber-500/[0.035]",
    border: "border-amber-500/15"
  },
  hold: {
    icon: ShieldCheck,
    label: "Hold",
    badge: "context" as const,
    text: "text-[#A29EFF]",
    bg: "bg-[#6C63FF]/[0.035]",
    border: "border-[#6C63FF]/15"
  },
  blocked: {
    icon: AlertOctagon,
    label: "Blocked",
    badge: "blocked" as const,
    text: "text-red-400",
    bg: "bg-red-500/[0.035]",
    border: "border-red-500/15"
  }
};

export function PendingApprovalsSummary({
  items,
  emptyState = "No outbound approvals pending",
  href,
  className,
  ctaLabel = "Open Approvals",
  totalCount,
}: PendingApprovalsSummaryProps) {
  const count = totalCount ?? items.length;

  return (
    <Card className={cn("border-white/[0.06] bg-[#111111]/75", className)}>
      <CardHeader className="border-b border-white/[0.04] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-heading font-extrabold text-white">Pending Approvals Queue</CardTitle>
            <CardDescription className="text-xs text-white/45">Human-reviewed drafts staged before any outbound action.</CardDescription>
          </div>
          <Badge variant="hold">{count} Review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center text-xs font-semibold uppercase tracking-wider text-white/35">
            {emptyState}
          </div>
        ) : (
          items.map((item) => {
            const status = statusConfig[item.status];
            const Icon = status.icon;
            return (
              <div key={`${item.leadName}-${item.property}`} className={cn("rounded-2xl border p-4", status.bg, status.border)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-heading font-extrabold text-white">{item.leadName}</p>
                    <p className="mt-1 truncate text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">{item.property}</p>
                  </div>
                  <Badge variant={status.badge} className="shrink-0">
                    <Icon className={cn("mr-1 size-3", status.text)} /> {status.label}
                  </Badge>
                </div>
                {typeof item.confidence === "number" && (
                  <p className="mt-3 text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">
                    Confidence <span className={status.text}>{item.confidence}%</span>
                  </p>
                )}
              </div>
            );
          })
        )}
        <Link href={href} className="flex items-center justify-center gap-2 rounded-xl border border-[#00E599]/20 bg-[#00E599]/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#00E599] transition-colors hover:bg-[#00E599]/15">
          {ctaLabel} <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
