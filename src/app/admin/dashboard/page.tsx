import { AppShell } from "@/components/layout/shell";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/data/auth";

export default async function AdminDashboardPage() {
  const profile = await requirePlatformAdmin();
  const supabase = await createClient();
  const [{ count: orgCount }, { count: memberCount }] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("organization_members").select("id", { count: "exact", head: true }),
  ]);

  return (
    <AppShell profile={profile} mode="admin">
      <section className="grid gap-5 md:grid-cols-3">
        <Card><CardHeader><CardTitle>{orgCount ?? 0}</CardTitle><CardDescription>Organizations configured</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{memberCount ?? 0}</CardTitle><CardDescription>Active/user membership records</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>Stage A</CardTitle><CardDescription>Auth + tenant core online</CardDescription></CardHeader></Card>
      </section>
      <Card className="mt-6">
        <CardHeader><CardTitle>Founder control layer</CardTitle><CardDescription>Minimal by design: enough to seed, verify, and demo first-client readiness without enterprise bloat.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-7 text-slate-600">Tenant setup access is live for controlled founder onboarding. Keep first-client demos managed — no public self-signup.</p>
          <Button asChild><Link href="/admin/tenants/new">Create tenant</Link></Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
