import Link from "next/link";
import { ArrowRight, Flame, RadioTower, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HotLeadAction } from "@/lib/data/dashboard-intelligence";

function scoreVariant(score: number) {
  if (score >= 75) return "error" as const;
  if (score >= 50) return "warning" as const;
  if (score >= 30) return "orchestration" as const;
  return "neutral" as const;
}

function formatLastInbound(value: string | null) {
  if (!value) return "No inbound thread yet";
  return new Date(value).toLocaleString();
}

export function HotLeadsNextActions({ orgSlug, items }: { orgSlug: string; items: HotLeadAction[] }) {
  return (
    <Card className="border-white/[0.06] bg-[#111111]/75 backdrop-blur-xl">
      <CardHeader className="border-b border-white/[0.04] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.28em] text-[#A29EFF]">
              AI Deal Desk Queue
            </span>
            <CardTitle className="mt-2 flex items-center gap-2 text-base font-heading font-extrabold text-white">
              <Flame className="size-4 text-amber-400" /> Hot Leads Queue
            </CardTitle>
            <CardDescription className="text-xs text-white/45">
              Deterministic ranking from existing urgency, last inbound, readiness, stage, tasks, and qualification state.
            </CardDescription>
          </div>
          <Badge variant={items.length > 0 ? "warning" : "neutral"}>{items.length} Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center">
            <RadioTower className="mx-auto size-7 text-white/20" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/45">No hot lead actions yet</p>
            <p className="mx-auto mt-2 max-w-md text-[10px] font-medium uppercase tracking-wider leading-relaxed text-white/30">
              Once real leads, open tasks, stage movement, or inbound messages exist, this queue will show Kopano what to handle next.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.leadId}
              href={`/app/${orgSlug}/leads/${item.leadId}`}
              className="block rounded-2xl border border-white/[0.04] bg-white/[0.015] p-4 transition-all hover:border-white/[0.1] hover:bg-white/[0.035]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-heading font-extrabold uppercase tracking-wide text-white">
                    {item.leadName}
                  </p>
                  <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">
                    {item.signal} / {item.stageName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={scoreVariant(item.score)}>{item.score} Signal</Badge>
                  <Badge variant={item.priority === "urgent" ? "error" : item.priority === "high" ? "warning" : "neutral"}>
                    {item.priority}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.04] bg-[#050505]/30 p-3">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/25">Urgency</p>
                  <p className="mt-1 text-xs font-heading font-extrabold uppercase text-white">{item.urgency}</p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-[#050505]/30 p-3">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/25">Readiness</p>
                  <p className="mt-1 text-xs font-heading font-extrabold uppercase text-[#00E599]">{item.readinessScore}%</p>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-[#050505]/30 p-3">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/25">Last inbound</p>
                  <p className="mt-1 text-[10px] font-mono font-bold uppercase text-white/60">{formatLastInbound(item.lastInboundAt)}</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.04] bg-[#050505]/30 p-3">
                <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-white/70">
                  <Target className="mt-0.5 size-3.5 shrink-0 text-[#00E599]" />
                  {item.nextAction}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.03] pt-2 text-[9px] font-mono font-bold uppercase tracking-widest text-white/25">
                <span>Qual: {item.qualificationStatus}</span>
                <span>Viewing: {item.viewingReadiness}</span>
              </div>
            </Link>
          ))
        )}
        <Button asChild variant="secondary" className="w-full rounded-xl bg-[#6C63FF]/10 text-[#A29EFF] hover:bg-[#6C63FF]/15">
          <Link href={`/app/${orgSlug}/leads`}>
            Open pipeline <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
