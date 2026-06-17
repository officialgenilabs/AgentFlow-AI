import Link from "next/link";
import { ArrowRight, CalendarCheck2, Eye, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ViewingReadyLead } from "@/lib/data/dashboard-intelligence";

function formatLastInbound(value: string | null) {
  if (!value) return "No inbound thread yet";
  return new Date(value).toLocaleString();
}

export function ViewingReadyQueue({ orgSlug, items }: { orgSlug: string; items: ViewingReadyLead[] }) {
  return (
    <Card className="border-white/[0.06] bg-[#111111]/75 backdrop-blur-xl">
      <CardHeader className="border-b border-white/[0.04] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.28em] text-[#00E599]">
              Viewing Desk
            </span>
            <CardTitle className="mt-2 flex items-center gap-2 text-base font-heading font-extrabold text-white">
              <Eye className="size-4 text-[#00E599]" /> Viewing Ready Queue
            </CardTitle>
            <CardDescription className="text-xs text-white/45">
              Leads surfaced only when existing stage, qualification, task, or conversation signals indicate viewing discussion readiness.
            </CardDescription>
          </div>
          <Badge variant={items.length > 0 ? "mint" : "neutral"}>{items.length} Ready</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center">
            <RadioTower className="mx-auto size-7 text-white/20" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/45">No viewing-ready leads yet</p>
            <p className="mx-auto mt-2 max-w-md text-[10px] font-medium uppercase tracking-wider leading-relaxed text-white/30">
              This stays empty until existing pipeline, qualification, task, or thread state indicates a real viewing discussion signal.
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
                    {item.stageName} / {item.qualificationStatus}
                  </p>
                </div>
                <Badge variant="mint">{item.readinessScore}% ready</Badge>
              </div>
              <div className="mt-3 rounded-xl border border-[#00E599]/15 bg-[#00E599]/[0.035] p-3">
                <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-[#00E599]">
                  <CalendarCheck2 className="mt-0.5 size-3.5 shrink-0" />
                  {item.nextAction}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.03] pt-2 text-[9px] font-mono font-bold uppercase tracking-widest text-white/25">
                <span>{item.viewingReadiness}</span>
                <span>Last inbound: {formatLastInbound(item.lastInboundAt)}</span>
              </div>
            </Link>
          ))
        )}
        <Button asChild variant="secondary" className="w-full rounded-xl bg-[#00E599]/10 text-[#00E599] hover:bg-[#00E599]/15">
          <Link href={`/app/${orgSlug}/leads`}>
            Open viewing pipeline <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
