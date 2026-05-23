import { AppShell } from "@/components/layout/shell";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { getPipelineStages } from "@/lib/data/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default async function DemoNewLeadPage() {
  const orgSlug = "boutique-properties";
  const tenant = await resolveTenantBySlug(orgSlug, true);
  const stages = await getPipelineStages(tenant.organization.id, true);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
            Traceable Lead Builder
          </h1>
          <p className="text-sm text-[#888888]">
            Construct a new high-fidelity lead container manually with source attribution.
          </p>
        </div>

        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.04] pb-6">
            <CardTitle className="text-base font-bold text-white">Manual Intake Parameters</CardTitle>
            <CardDescription className="text-xs text-[#888888]">Please input verified source integrity details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/5 p-4 text-[11px] text-[#A29EFF] font-mono font-bold flex items-center gap-2 select-none">
              <ShieldAlert className="size-4 shrink-0" />
              <span>SOURCE INTEGRITY DOCTRINE ENFORCED: PRE-VERIFY LEAD CREDENTIALS TO AVOID COLLISION.</span>
            </div>

            <form className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="full_name">Lead Full Name</Label>
                <Input id="full_name" placeholder="e.g. Sibusiso Ndlovu" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Operator Identity (Email)</Label>
                <Input id="email" type="email" placeholder="e.g. client@domain.co.za" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Operations Key (Phone)</Label>
                <Input id="phone" type="tel" placeholder="e.g. +27 82 555 0192" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exact_source">Exact Ingress Source</Label>
                <Input id="exact_source" placeholder="e.g. Property24" required />
              </div>

              <div className="pt-4">
                <Button type="button" className="w-full bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90 font-semibold h-11 rounded-xl">
                  Simulate Lead Creation
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
