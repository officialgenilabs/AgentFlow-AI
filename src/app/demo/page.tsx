import Link from "next/link";
import { ShieldCheck, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo";

export default function DemoLandingPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#FAFAFA] relative overflow-hidden flex items-center justify-center p-6 select-none">
      {/* Background Cinematic Orbs */}
      <div className="absolute -left-40 -top-40 w-96 h-96 bg-[#00E599] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-[#6C63FF] rounded-full blur-[140px] opacity-8 pointer-events-none" />

      <div className="w-full max-w-2xl z-10 space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <LogoMark size={72} glow />
          <div className="space-y-2 mt-4">
            <h1 className="text-xl font-heading font-extrabold tracking-[0.25em] text-white uppercase">
              AGENTFLOW <span className="text-[#00E599]">AI</span>
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold font-mono">
              Guided Operational Simulator
            </p>
          </div>
        </div>

        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl p-8 text-left space-y-6">
          <CardHeader className="p-0 space-y-2">
            <CardTitle className="text-xl font-heading font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#00E599]" />
              Frictionless Sandbox Mode
            </CardTitle>
            <CardDescription className="text-xs text-white/50 leading-relaxed">
              Step into the shoes of a lead operational broker. This is a fully pre-seeded, zero-dependency environment representing the true Gen I Labs conversational wedge.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 space-y-4 pt-4 border-t border-white/[0.04] text-xs leading-relaxed text-white/60">
            <div className="flex items-start gap-3">
              <div className="size-5 rounded-full bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#00E599] font-mono font-bold text-[10px]">1</div>
              <div>
                <p className="font-bold text-white">Full Operational Access</p>
                <p className="text-white/50 mt-0.5">Explore the dashboard cockpit, live WhatsApp queues, approvals panels, lead chronological timelines, and governance parameters.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-5 rounded-full bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#00E599] font-mono font-bold text-[10px]">2</div>
              <div>
                <p className="font-bold text-white">Zero Mutation Integrity</p>
                <p className="text-white/50 mt-0.5">No database modifications, Supabase connections, or network actions are required. All pipeline operations are executed synthetically in your browser context.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-5 rounded-full bg-[#6C63FF]/10 border border-[#6C63FF]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#A29EFF] font-mono font-bold text-[10px]">3</div>
              <div>
                <p className="font-bold text-white">South African RE Wedge Context</p>
                <p className="text-white/50 mt-0.5">Pre-seeded with boutique real estate leads (Sandton, Clifton, Camps Bay) representing real-world viewing bookings and opportunity-leak resolutions.</p>
              </div>
            </div>
          </CardContent>

          <div className="pt-4 border-t border-white/[0.04]">
            <Button asChild className="w-full h-12 bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl font-bold uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(0,229,153,0.15)] flex items-center justify-center gap-2">
              <Link href="/demo/dashboard">
                Initialize Sandbox Operations <Play className="size-4 fill-current shrink-0" />
              </Link>
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-4 text-[10px] font-mono tracking-wider text-white/30 uppercase select-none">
          <span>Staging v1.0.4</span>
          <span>•</span>
          <span>Zero-Dependency Mode</span>
          <span>•</span>
          <span>Public Access OK</span>
        </div>
      </div>
    </main>
  );
}
