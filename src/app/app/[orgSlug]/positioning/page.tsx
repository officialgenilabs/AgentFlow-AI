import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { Sparkles, AlertTriangle, ShieldCheck, TrendingDown, Target, Zap } from "lucide-react";

export default async function PositioningPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  const vectors = [
    {
      id: "v-1",
      title: "Inbound Opportunity Leakage",
      problem: "WhatsApp chat chains, Property24 notification emails, and website webhook triggers are highly fragmented. Agents physically miss high-intent inquiries.",
      solution: "AgentFlow AI acts as a single operational ingress node, listening to all streams and locking identity keys instantly."
    },
    {
      id: "v-2",
      title: "Context Memory Fragmentation",
      problem: "Agents manage multiple luxury buyers simultaneously. Memory failure of client preferences, search budgets, and viewing histories limits pipeline trust.",
      solution: "Autonomous Chronological Memory Timeline compiles every single touchpoint, parsing preferences into structured chronological events."
    },
    {
      id: "v-3",
      title: "Viewing Confirmation Latency",
      problem: "Boutique agents lose deals because coordinating calendars across sellers, brokers, and luxury buyers takes hours. High friction scheduling loops.",
      solution: "Instant automated tour scheduling syncd with Google Workspace and direct WhatsApp dispatch locks booking confirmations."
    }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-1 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#00E599]">The Strategic Wedge</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#FAFAFA] font-sans mt-2">
            Why Boutique Real Estate First
          </h1>
          <p className="text-sm text-[#888888] leading-relaxed mt-1">
            Boutique real estate represents the ideal operational wedge. High-transaction, high-margin, context-intensive communication patterns where a single missed lead equals thousands of Rands in lost revenue.
          </p>
        </div>

        {/* Vectors & Resolutions Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {vectors.map((vec) => (
            <Card key={vec.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl hover:border-white/[0.12] transition-all flex flex-col justify-between p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <h3 className="text-sm font-bold text-[#FAFAFA] uppercase tracking-wider">{vec.title}</h3>
                </div>
                
                <p className="text-xs text-[#888888] leading-relaxed">
                  {vec.problem}
                </p>

                <div className="pt-4 border-t border-white/[0.04] flex items-start gap-2">
                  <Zap className="h-4.5 w-4.5 text-[#00E599] shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    <span className="font-semibold text-white">Resolution: </span>
                    {vec.solution}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* High-Level Thesis Card */}
        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#6C63FF]/5 rounded-full blur-[100px] -z-10" />
          <div className="space-y-4 max-w-4xl">
            <h2 className="text-xl font-bold text-[#FAFAFA] font-sans flex items-center gap-2">
              <Target className="h-5 w-5 text-[#6C63FF]" />
              The Inevitability of Gen I Labs
            </h2>
            <p className="text-xs text-[#888888] leading-relaxed font-sans">
              Gen I Labs is not built as a simple chatbot CRM wrapper. The real estate market serves as our wedge to solve fundamental infrastructure-level problem patterns: context memory failure, scheduling coordination delays, and governed communication gates. 
            </p>
            <p className="text-xs text-[#888888] leading-relaxed font-sans">
              By deploying AgentFlow AI within highly specialized high-value boutique brokerages, we construct the foundation of a general-purpose operational intelligence platform that manages context memory and governs autonomous customer relations across dozens of physical service sectors.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
