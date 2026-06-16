import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/data/auth";
import { isDemoMode } from "@/lib/demo/config";
import { demoOrganization } from "@/lib/demo/data";
import type { Organization } from "@/lib/types";

export default async function AdminTenantsPage() {
  const profile = await requirePlatformAdmin();

  let organizations: (Organization & { created_at?: string })[] = [];
  if (isDemoMode()) {
    organizations = [
      demoOrganization,
      {
        id: "demo-org-2",
        name: "Ascent Camps Bay Portfolio",
        slug: "ascent-camps-bay",
        status: "active",
        industry: "real_estate",
        plan: "enterprise",
        created_at: new Date().toISOString()
      }
    ];
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("id, name, slug, status, industry, plan, created_at")
      .order("created_at", { ascending: false });
    organizations = data ?? [];
  }

  return (
    <AppShell profile={profile} mode="admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
              Tenant Environments
            </h1>
            <p className="text-sm text-[#888888]">
              Monitor and onboard active organization workspaces and white-label contexts.
            </p>
          </div>
          <Button asChild className="bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90 font-semibold rounded-xl">
            <Link href="/admin/tenants/new">Provision New Tenant</Link>
          </Button>
        </div>

        <div className="grid gap-4">
          {organizations.map((org) => (
            <Card key={org.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <CardTitle className="text-lg font-bold text-[#FAFAFA]">{org.name}</CardTitle>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                      org.status === "active"
                        ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {org.status}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-[#888888]">
                    Slug: <span className="font-mono text-white/[0.6]">{org.slug}</span> • Plan: <span className="font-semibold text-white/[0.8] uppercase tracking-wider">{org.plan}</span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="border-white/[0.08] hover:bg-white/[0.06] text-[#FAFAFA] rounded-xl" size="sm">
                    <Link href={`/app/${org.slug}/dashboard`}>Open Dashboard</Link>
                  </Button>
                  <Button asChild variant="ghost" className="text-[#888888] hover:text-[#FAFAFA] hover:bg-white/[0.04] rounded-xl" size="sm">
                    <Link href={`/app/${org.slug}/branding`}>Branding Engine</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}

          {organizations.length === 0 && (
            <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
              <CardContent className="p-12 text-center text-sm text-[#888888]">
                No tenants yet. Create the first controlled staging tenant context.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
