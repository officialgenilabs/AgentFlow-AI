import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingForm } from "@/features/branding/branding-form";
import { resolveTenantBySlug } from "@/lib/data/auth";

export default async function BrandingPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const tenant = await resolveTenantBySlug(orgSlug);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <Card>
        <CardHeader>
          <CardTitle>Branding engine MVP</CardTitle>
          <CardDescription>Logo and theme controls persist against the verified organization context.</CardDescription>
          {query.saved ? <p className="text-sm font-medium text-emerald-700">Branding saved.</p> : null}
          {query.error ? <p className="text-sm font-medium text-red-700">Branding update failed: {query.error}</p> : null}
        </CardHeader>
        <CardContent><BrandingForm organization={tenant.organization} branding={tenant.branding} /></CardContent>
      </Card>
    </AppShell>
  );
}
