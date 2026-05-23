import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";
import { LogoMark } from "@/components/brand/logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#050505] text-[#FAFAFA] relative overflow-hidden lg:grid-cols-2 select-none">
      {/* Background Cinematic Orbs */}
      <div className="absolute -left-40 -top-40 w-[500px] h-[500px] bg-[#00E599] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute -right-40 -bottom-40 w-[500px] h-[500px] bg-[#6C63FF] rounded-full blur-[140px] opacity-8 pointer-events-none" />

      {/* Left side: branding/context */}
      <section className="relative flex flex-col justify-between p-8 lg:p-16 border-r border-white/[0.04] bg-white/[0.01] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <LogoMark size={32} glow />
          <span className="font-heading font-extrabold tracking-wider text-sm leading-none text-white">
            AGENTFLOW <span className="text-[#00E599]">AI</span>
          </span>
        </div>

        <div className="max-w-xl my-auto py-12 text-left">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#00E599]">Wedge 01: Boutique Real Estate</p>
          <h1 className="mt-6 text-5xl font-heading font-extrabold tracking-tight text-white lg:text-7xl leading-tight">
            Operational Calm <span className="text-white/40 font-normal">Under Pressure.</span>
          </h1>
          <p className="mt-6 text-base leading-7 text-white/50 max-w-md">
            Businesses lose revenue because inbound opportunities leak through fragmented systems. AgentFlow AI is the infrastructure-grade operational layer that seals those leaks.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">
            Gen I Labs © 2026 // Staging Environment
          </span>
        </div>
      </section>

      {/* Right side: Login Panel */}
      <section className="flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md rounded-3xl border border-white/[0.06] bg-[#111111]/70 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl hover:border-white/[0.09] transition-all duration-300">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 text-left">Security Gateway</p>
          <h2 className="mt-3 text-2xl font-heading font-bold text-white text-left">Secure Operations Access</h2>
          <p className="mt-2 text-xs leading-5 text-white/40 text-left">
            Authorized runtime operators are resolved into isolated tenant structures. Outbound governance defaults to strict human-verification.
          </p>
          
          <div className="mt-8">
            <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs font-mono text-white/30">Loading gateway...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
