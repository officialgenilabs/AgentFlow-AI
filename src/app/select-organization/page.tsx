import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Building2, ChevronRight } from "lucide-react";
import { getCurrentProfile, getUserOrganizations } from "@/lib/data/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo";
import { StatusIndicator } from "@/components/ui/status-indicator";

export default async function SelectOrganizationPage() {
  const [profile, organizations] = await Promise.all([getCurrentProfile(), getUserOrganizations()]);

  // Bypass redirects if in demo mode to let the user select context, or if they only have 1 org
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  
  if (!isDemoMode && !profile.is_platform_admin && organizations.length === 1) {
    redirect(`/app/${organizations[0].slug}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#FAFAFA] relative overflow-hidden flex items-center justify-center p-6 select-none">
      {/* Background Cinematic Orbs */}
      <div className="absolute -left-40 -top-40 w-96 h-96 bg-[#00E599] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-[#6C63FF] rounded-full blur-[140px] opacity-8 pointer-events-none" />

      <div className="w-full max-w-xl z-10 space-y-6">
        <div className="flex flex-col items-center gap-3 mb-4">
          <LogoMark size={48} glow />
          <h1 className="text-sm font-heading font-extrabold tracking-[0.2em] text-white uppercase mt-2">
            AgentFlow <span className="text-[#00E599]">AI</span>
          </h1>
        </div>

        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
          <CardHeader className="text-left border-b border-white/[0.04] pb-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Select Operational Context</CardTitle>
              <StatusIndicator status="active" pulse label="Live Gateway" />
            </div>
            <CardDescription className="mt-2 text-xs">
              Operator identity resolved. Please choose the workspace domain to assume execution. Cryptographic isolation remains server-side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {profile.is_platform_admin ? (
              <Button asChild className="w-full justify-start h-12 bg-white/[0.03] text-white border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all" variant="outline">
                <Link href="/admin/dashboard">
                  <ShieldCheck className="size-4 text-[#6C63FF] mr-3" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-xs uppercase tracking-wider">Founder Controller Cockpit</span>
                    <span className="text-[10px] text-white/40 font-medium normal-case mt-0.5">Platform administrative access</span>
                  </div>
                  <ChevronRight className="size-4 ml-auto text-white/30" />
                </Link>
              </Button>
            ) : null}
            
            {organizations.map((org) => (
              <Button key={org.id} asChild className="w-full justify-start h-12 bg-white/[0.03] text-white border border-white/[0.06] hover:bg-[#00E599]/10 hover:border-[#00E599]/30 hover:text-white transition-all group" variant="outline">
                <Link href={`/app/${org.slug}/dashboard`}>
                  <Building2 className="size-4 text-[#00E599] mr-3 group-hover:scale-105 transition-transform" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-xs uppercase tracking-wider">{org.name}</span>
                    <span className="text-[10px] text-white/40 font-medium normal-case mt-0.5">Staging operational node</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="rounded-full bg-[#00E599]/10 border border-[#00E599]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#00E599] font-mono">
                      {org.status}
                    </span>
                    <ChevronRight className="size-4 text-white/30 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </Button>
            ))}
            
            {organizations.length === 0 && !profile.is_platform_admin ? (
              <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-white/40 leading-relaxed text-left font-medium select-none">
                No active organization memberships found associated with your operator profile. Dynamic organization auto-provisioning requires founder escalation.
              </p>
            ) : null}
          </CardContent>
        </Card>
        
        <p className="text-[9px] font-mono tracking-widest text-white/30 uppercase text-center">
          Cryptographic security resolved via staging/canonical-frontend-elevation
        </p>
      </div>
    </main>
  );
}
