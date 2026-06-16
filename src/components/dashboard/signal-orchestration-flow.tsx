import { ArrowRight, RadioTower, Route, ShieldCheck, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SignalOrchestrationTone = "safe" | "intelligence" | "warning" | "blocked";

export interface SignalOrchestrationStep {
  label: string;
  value: string;
  detail: string;
  tone: SignalOrchestrationTone;
}

interface SignalOrchestrationFlowProps {
  title: string;
  description: string;
  steps: SignalOrchestrationStep[];
  mode?: "demo" | "tenant";
  className?: string;
}

const toneConfig = {
  safe: {
    icon: RadioTower,
    dot: "bg-[#00E599]",
    text: "text-[#00E599]",
    border: "border-[#00E599]/20",
    bg: "bg-[#00E599]/[0.035]",
    badge: "mint" as const
  },
  intelligence: {
    icon: Sparkles,
    dot: "bg-[#6C63FF]",
    text: "text-[#A29EFF]",
    border: "border-[#6C63FF]/20",
    bg: "bg-[#6C63FF]/[0.035]",
    badge: "context" as const
  },
  warning: {
    icon: ShieldCheck,
    dot: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.035]",
    badge: "hold" as const
  },
  blocked: {
    icon: Route,
    dot: "bg-red-500",
    text: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/[0.035]",
    badge: "blocked" as const
  }
};

export function SignalOrchestrationFlow({
  title,
  description,
  steps,
  mode = "demo",
  className
}: SignalOrchestrationFlowProps) {
  return (
    <Card className={cn("relative overflow-hidden border-white/[0.06] bg-[#111111]/75", className)}>
      <div className="absolute -left-20 -top-20 size-48 rounded-full bg-[#00E599]/10 blur-[90px]" />
      <div className="absolute -right-20 -bottom-20 size-48 rounded-full bg-[#6C63FF]/10 blur-[90px]" />
      <CardHeader className="relative border-b border-white/[0.04] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.28em] text-[#00E599]">
              {mode === "demo" ? "Demo-Safe Layer" : "Tenant Signal Layer"}
            </span>
            <CardTitle className="mt-2 text-xl font-heading font-extrabold text-white">{title}</CardTitle>
            <CardDescription className="mt-1 text-xs leading-relaxed text-white/50">{description}</CardDescription>
          </div>
          <Badge variant={mode === "demo" ? "mint" : "orchestration"}>
            {mode === "demo" ? "No Production Writes" : "Live Data Required"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="relative pt-6">
        <div className="grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => {
            const tone = toneConfig[step.tone];
            const Icon = tone.icon;
            return (
              <div key={step.label} className="relative">
                {index < steps.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-4 -translate-y-1/2 text-white/20 md:block" />
                )}
                <div className={cn("h-full rounded-2xl border p-4 transition-all hover:border-white/15", tone.border, tone.bg)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn("flex size-9 items-center justify-center rounded-xl border", tone.border)}>
                      <Icon className={cn("size-4", tone.text)} />
                    </div>
                    <span className={cn("size-2 rounded-full", tone.dot)} />
                  </div>
                  <p className="mt-4 text-[10px] font-mono font-bold uppercase tracking-widest text-white/35">
                    {step.label}
                  </p>
                  <p className="mt-1 text-lg font-heading font-extrabold text-white">{step.value}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-white/45">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
