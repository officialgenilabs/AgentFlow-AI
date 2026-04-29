import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";

export default async function TenantDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <section className="grid gap-5 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Conversion Room</CardTitle><CardDescription>Lead operating shell ready for CRM connection.</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{tenant.organization.status}</CardTitle><CardDescription>Tenant status</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{tenant.organization.plan}</CardTitle><CardDescription>Managed SaaS plan</CardDescription></CardHeader></Card>
      </section>
      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Premium client dashboard shell</CardTitle>
          <CardDescription>This is the tenant-specific white-label surface. Stage 30 backend data connects here next; backend logic is not rebuilt.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[2rem] border border-slate-200 bg-[var(--brand-secondary)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-accent)]">{tenant.organization.name}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Lead conversion operations, branded for your team.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Tenant identity, route protection, organization resolution, and theme persistence are now in place.</p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
