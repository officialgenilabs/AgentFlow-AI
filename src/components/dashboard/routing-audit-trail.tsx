import { Activity, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface RoutingAuditEntry {
  timestamp: string;
  event: string;
  actor: string;
  status: "verified" | "hold" | "blocked" | "system";
}

interface RoutingAuditTrailProps {
  entries: RoutingAuditEntry[];
  title?: string;
  description?: string;
  className?: string;
}

const statusStyles = {
  verified: "text-[#00E599] border-[#00E599]/15 bg-[#00E599]/[0.035]",
  hold: "text-amber-400 border-amber-500/15 bg-amber-500/[0.035]",
  blocked: "text-red-400 border-red-500/15 bg-red-500/[0.035]",
  system: "text-[#A29EFF] border-[#6C63FF]/15 bg-[#6C63FF]/[0.035]"
};

export function RoutingAuditTrail({
  entries,
  title = "Live Routing Audit Trail",
  description = "Demo-safe governance events for capture, routing, and approval state.",
  className
}: RoutingAuditTrailProps) {
  return (
    <Card className={cn("border-white/[0.06] bg-[#111111]/75", className)}>
      <CardHeader className="border-b border-white/[0.04] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-heading font-extrabold text-white">
              <Activity className="size-4 text-[#A29EFF]" /> {title}
            </CardTitle>
            <CardDescription className="text-xs text-white/45">{description}</CardDescription>
          </div>
          <Badge variant="context"><ShieldCheck className="mr-1 size-3" /> Audited</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {entries.map((entry) => (
          <div key={`${entry.timestamp}-${entry.event}`} className={cn("rounded-2xl border p-4", statusStyles[entry.status])}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">
              <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span>{entry.actor}</span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-white/70">{entry.event}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
