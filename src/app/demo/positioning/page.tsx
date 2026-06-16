import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { Layers, HelpCircle, ShieldCheck } from "lucide-react";

export default async function DemoPositioningPage() {
  const orgSlug = "boutique-properties";
  const tenant = await resolveTenantBySlug(orgSlug, true);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#00E599]" />
            Real Estate Ingress Wedge Thesis
          </h1>
          <p className="text-sm text-[#888888]">
            Strategic business overview of the opportunity leakage framework for luxury boutique property brokers.
          </p>
        </div>

        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg">Opportunity Leakage Framework</CardTitle>
            <CardDescription className="text-xs text-[#888888]">Why premium boutique brokerages lose revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-white/70">
            <p>
              Premium real estate agencies operate in high-value, high-context landscapes. In Sandton, Camps Bay, and Clifton, a single lead representing a R15M+ property can yield high commission margins.
            </p>
            <p>
              However, agencies lose substantial revenues daily due to structural opportunity leaks:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/50">
              <li><strong className="text-white">Viewing Latency</strong>: Leads requesting property details or weekend viewing slots expect instantaneous response. Delaying response beyond 5 minutes decreases conversion probability by 80%.</li>
              <li><strong className="text-white">Memory Fragmentation</strong>: Leads communicating across different agents and fragmented channels (WhatsApp, Property24, email) lose context memory, causing duplicated outreach and friction.</li>
              <li><strong className="text-white">Outbound Chaos</strong>: Automated systems without strict governance locks send unverified templates that alienate luxury buyers.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
