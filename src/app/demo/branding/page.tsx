import { AppShell } from "@/components/layout/shell";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { BrandingForm } from "@/features/branding/branding-form";

export default async function DemoBrandingPage() {
  const orgSlug = "boutique-properties";
  const tenant = await resolveTenantBySlug(orgSlug, true);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
            Brand Orchestration Engine
          </h1>
          <p className="text-sm text-[#888888]">
            Configure tenant aesthetics, typography overrides, and white-label parameters.
          </p>
        </div>

        <BrandingForm organization={tenant.organization} branding={tenant.branding} />
      </div>
    </AppShell>
  );
}
