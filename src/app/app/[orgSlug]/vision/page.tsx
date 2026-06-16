import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { Sparkles, Layers, ShieldCheck, Cpu, Database, Network } from "lucide-react";

export default async function VisionPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  const timeline = [
    {
      phase: "Phase 1",
      title: "Real Estate Ingress Wedge",
      status: "current",
      icon: Database,
      desc: "Deploy autonomous CRM timelines, WhatsApp parser engines, and human-supervised AI approval panels to plug high-margin lead leakage in boutique brokerages.",
      features: ["Chronological Memory timeline", "Secure AI Approval queues", "Automatic PII redaction gates"]
    },
    {
      phase: "Phase 2",
      title: "Multi-Agent Coordination",
      status: "next",
      icon: Cpu,
      desc: "Introduce agent-to-agent negotiation protocols. An autonomous buyer-agent communicates with a listing-agent to resolve scheduling viewings, pricing offers, and contract gates.",
      features: ["Agent-to-Agent negotiation hooks", "Dynamic calendar consensus matching", "Automated contract draft prep"]
    },
    {
      phase: "Phase 3",
      title: "Decentralized Memory Vaults",
      status: "future",
      icon: Network,
      desc: "Migrate client profile databases to secure cryptographic memory vaults. Zero-knowledge proof structures that allow agents to verify buyer budgets without holding plain text finance files.",
      features: ["Zero-knowledge budget proofs", "Autonomous contextual DB shards", "Decentralized agency nodes"]
    }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col gap-1 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#6C63FF]">Long-Term Thesis</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#FAFAFA] font-sans mt-2 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-[#00E599]" />
            Future Vision Roadmap
          </h1>
          <p className="text-sm text-[#888888] leading-relaxed mt-1">
            AgentFlow AI is the wedge. Our target is the deployment of secure, governed, autonomous operational intelligence layers across high-value commerce.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative border-l border-white/[0.06] ml-4 pl-8 space-y-12">
          {timeline.map((node, idx) => {
            const Icon = node.icon;
            return (
              <div key={idx} className="relative group">
                {/* Pulse timeline node indicator */}
                <div className={`absolute -left-[45px] top-1.5 w-6 h-6 rounded-full border border-[#111111] flex items-center justify-center ${
                  node.status === "current" ? "bg-[#00E599]" :
                  node.status === "next" ? "bg-[#6C63FF]" :
                  "bg-[#222222]"
                }`}>
                  <Icon className={`h-3.5 w-3.5 ${
                    node.status === "current" ? "text-[#00E599]" :
                    node.status === "next" ? "text-[#6C63FF]" :
                    "text-[#888888]"
                  } shrink-0`} style={{ color: node.status === "current" ? "#0A0A0A" : node.status === "next" ? "#FAFAFA" : "#888888" }} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#888888] font-mono tracking-widest uppercase">{node.phase}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      node.status === "current" ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20" :
                      node.status === "next" ? "bg-[#6C63FF]/10 text-[#6C63FF] border-[#6C63FF]/20" :
                      "bg-white/[0.02] text-[#888888] border-white/[0.04]"
                    }`}>
                      {node.status}
                    </span>
                  </div>

                  <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl group-hover:border-white/[0.12] transition-all p-6">
                    <CardHeader className="p-0 pb-3">
                      <CardTitle className="text-lg font-bold text-[#FAFAFA] font-sans">{node.title}</CardTitle>
                      <CardDescription className="text-xs text-[#888888] mt-2 leading-relaxed font-sans">{node.desc}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 pt-4 border-t border-white/[0.04] mt-2">
                      <div className="flex flex-wrap gap-2">
                        {node.features.map((feat, fIdx) => (
                          <span key={fIdx} className="text-xs bg-[#1A1A1A] border border-white/[0.06] text-[#E5E5E5] px-3 py-1 rounded-xl">
                            {feat}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
