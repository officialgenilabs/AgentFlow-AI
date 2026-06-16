import { AppShell } from "@/components/layout/shell";
import { BrandingForm } from "@/features/branding/branding-form";
import { resolveTenantBySlug } from "@/lib/data/auth";

export default async function BrandingPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const tenant = await resolveTenantBySlug(orgSlug);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
            Brand Orchestration Engine
          </h1>
          <p className="text-sm text-[#888888]">
            Configure tenant aesthetics, typography overrides, and white-label parameters.
          </p>
        </div>

        {query.saved && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            Brand configuration successfully persisted. Cache revalidated.
          </div>
        )}

        {query.error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 text-red-400 text-sm font-medium">
            Brand persistence failed: {query.error === "manager-role-required" ? "Manager role required" : query.error}
          </div>
        )}

        <BrandingForm organization={tenant.organization} branding={tenant.branding} />
      </div>
    </AppShell>
  );
}
