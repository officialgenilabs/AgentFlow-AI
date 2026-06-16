import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { Eye } from "lucide-react";

export default async function DemoVisionPage() {
  const orgSlug = "boutique-properties";
  const tenant = await resolveTenantBySlug(orgSlug, true);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <Eye className="h-6 w-6 text-[#00E599]" />
            Future Vision Roadmap
          </h1>
          <p className="text-sm text-[#888888]">
            Explore the multi-phase evolution from a real estate conversational wedge to a generalized operational intelligence network.
          </p>
        </div>

        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg">The Operational Intelligence Road Map</CardTitle>
            <CardDescription className="text-xs text-[#888888]">Pragmatic wedges leading to generalized cryptographic memory networks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-white/70">
            <div className="relative border-l border-white/[0.08] pl-6 ml-2 space-y-6">
              <div className="relative">
                <span className="absolute -left-[29px] top-1 size-2.5 rounded-full bg-[#00E599]" />
                <h3 className="font-bold text-white uppercase text-xs">Phase 1: Real Estate Conversational Wedge (Current)</h3>
                <p className="text-white/50 mt-1">Isolating property intake APIs, WhatsApp conversational loops, manual approvals verification, and viewings reservations.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[29px] top-1 size-2.5 rounded-full bg-[#6C63FF]" />
                <h3 className="font-bold text-white uppercase text-xs">Phase 2: Multi-Agent Negotiation Protocol</h3>
                <p className="text-white/50 mt-1">Autonomous buyer-broker negotiating frameworks, secure escrow locks triggers, and contract details extractors.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[29px] top-1 size-2.5 rounded-full bg-white/20" />
                <h3 className="font-bold text-white uppercase text-xs">Phase 3: Decentralized Cryptographic ZK Vaults</h3>
                <p className="text-white/50 mt-1">Enforcing zero-knowledge memory layers and verifiable sovereign identities, enabling clients to lock down and govern their personal data cryptographically.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
