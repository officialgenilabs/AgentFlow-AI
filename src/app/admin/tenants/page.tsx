import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/data/auth";

export default async function AdminTenantsPage() {
  const profile = await requirePlatformAdmin();
  const supabase = await createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug, status, industry, plan, created_at")
    .order("created_at", { ascending: false });

  return (
    <AppShell profile={profile} mode="admin">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Founder onboarding</p>
          <h2 className="text-2xl font-semibold text-slate-950">Tenants</h2>
        </div>
        <Button asChild><Link href="/admin/tenants/new">Create tenant</Link></Button>
      </div>
      <div className="grid gap-4">
        {(organizations ?? []).map((org) => (
          <Card key={org.id}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>{org.slug} · {org.status} · {org.plan}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm"><Link href={`/app/${org.slug}/dashboard`}>Open dashboard</Link></Button>
                <Button asChild variant="ghost" size="sm"><Link href={`/app/${org.slug}/branding`}>Branding</Link></Button>
              </div>
            </CardHeader>
          </Card>
        ))}
        {(organizations ?? []).length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-slate-500">No tenants yet. Create the first controlled staging tenant.</CardContent></Card>
        ) : null}
      </div>
    </AppShell>
  );
}
