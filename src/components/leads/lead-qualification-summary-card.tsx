import { AlertTriangle, BarChart3, Database, Eye, HelpCircle, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeadQualificationSummary } from "@/lib/data/qualification";

function badgeVariant(tone: LeadQualificationSummary["readinessTone"]) {
  if (tone === "mint") return "mint" as const;
  if (tone === "orchestration") return "orchestration" as const;
  if (tone === "warning") return "warning" as const;
  if (tone === "active") return "active" as const;
  return "neutral" as const;
}

function scoreVariant(score: number) {
  if (score >= 78) return "mint" as const;
  if (score >= 52) return "warning" as const;
  return "neutral" as const;
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function LeadQualificationSummaryCard({
  summary,
  compact = false,
  className,
}: {
  summary: LeadQualificationSummary;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("border-white/[0.06] bg-[#111111]/75 backdrop-blur-xl overflow-hidden relative", compact ? "" : "mb-6", className)}>
      <div className="absolute -right-16 -top-16 size-40 rounded-full bg-[#6C63FF]/10 blur-[80px]" />
      <CardHeader className="relative border-b border-white/[0.04] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.28em] text-[#00E599]">
              AI Deal Desk
            </span>
            <CardTitle className="mt-2 flex items-center gap-2 text-base font-heading font-extrabold text-white">
              <Sparkles className="size-4 text-[#00E599]" /> Lead Intelligence Card
            </CardTitle>
            <CardDescription className="text-xs text-white/45">
              Deterministic read-only intelligence from existing lead, task, qualification, conversation, and approval signals.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={badgeVariant(summary.readinessTone)}>{label(summary.readinessState)}</Badge>
            <Badge variant={scoreVariant(summary.confidenceScore)}>{summary.confidenceScore}% confidence</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("relative pt-5", compact ? "space-y-4" : "space-y-5")}>
        <div className={cn("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4")}>
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">
              <BarChart3 className="size-3 text-[#00E599]" /> Readiness Score
            </p>
            <p className="mt-2 text-xl font-heading font-extrabold text-white">{summary.readinessScore}%</p>
          </div>
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">
              <Eye className="size-3 text-[#A29EFF]" /> Viewing Readiness
            </p>
            <p className="mt-2 text-xs font-heading font-extrabold uppercase text-white">{label(summary.viewingReadiness)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">
              <AlertTriangle className="size-3 text-amber-400" /> Urgency
            </p>
            <p className="mt-2 text-xs font-heading font-extrabold uppercase text-white">{label(summary.urgency)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">
              <ShieldCheck className="size-3 text-[#00E599]" /> Source Trust
            </p>
            <p className="mt-2 text-xs font-heading font-extrabold uppercase text-white">{summary.sourceTrust}</p>
            <p className="mt-1 text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">{summary.sourceTrustScore}% trace</p>
          </div>
        </div>

        <div className={cn("grid gap-5", compact ? "" : "lg:grid-cols-[1fr_1fr_1.1fr]")}>
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/30">Known Intelligence</p>
            <div className="flex flex-wrap gap-2">
              {summary.knownFields.length === 0 ? (
                <span className="rounded-full border border-white/[0.04] bg-white/[0.02] px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-white/30">
                  Nothing material captured yet
                </span>
              ) : summary.knownFields.map((field) => (
                <Badge key={field} variant="mint">{field}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/30">Missing Information</p>
            <div className="flex flex-wrap gap-2">
              {summary.missingFields.length === 0 ? (
                <Badge variant="active">No core gaps detected</Badge>
              ) : summary.missingFields.map((field) => (
                <Badge key={field} variant="warning">{field}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-[#00E599]/15 bg-[#00E599]/[0.035] p-4">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#00E599]/70">Recommended action</p>
              <p className="mt-2 flex items-start gap-2 text-xs font-semibold leading-relaxed text-[#00E599]">
                <ListChecks className="mt-0.5 size-4 shrink-0" />
                {summary.nextBestAction}
              </p>
            </div>
            <div className="rounded-2xl border border-[#6C63FF]/15 bg-[#6C63FF]/[0.035] p-4">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">Recommended next question</p>
              <p className="mt-2 flex items-start gap-2 text-xs font-semibold leading-relaxed text-white/70">
                <HelpCircle className="mt-0.5 size-4 shrink-0 text-[#A29EFF]" />
                {summary.suggestedNextQuestion}
              </p>
            </div>
          </div>
        </div>

        {summary.sourceMetadata.length > 0 ? (
          <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4">
            <p className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">
              <Database className="size-3 text-[#6C63FF]" /> Source Metadata
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.sourceMetadata.map((item) => (
                <Badge key={item} variant="context">{item}</Badge>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
