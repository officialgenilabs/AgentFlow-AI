import Image from "next/image";
import { updateBranding } from "@/features/branding/actions";
import type { Organization, OrganizationBranding } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrandingForm({ organization, branding }: { organization: Organization; branding: OrganizationBranding }) {
  const action = updateBranding.bind(null, organization.slug);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="space-y-2"><Label htmlFor="logo">Tenant logo</Label><Input id="logo" name="logo" type="file" accept="image/*" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2"><Label htmlFor="primary_color">Primary</Label><Input id="primary_color" name="primary_color" type="color" defaultValue={branding.primary_color} /></div>
          <div className="space-y-2"><Label htmlFor="secondary_color">Surface</Label><Input id="secondary_color" name="secondary_color" type="color" defaultValue={branding.secondary_color} /></div>
          <div className="space-y-2"><Label htmlFor="accent_color">Accent</Label><Input id="accent_color" name="accent_color" type="color" defaultValue={branding.accent_color} /></div>
        </div>
        <Button type="submit" className="w-full">Persist tenant brand</Button>
      </div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" style={{ "--brand-primary": branding.primary_color, "--brand-secondary": branding.secondary_color, "--brand-accent": branding.accent_color } as React.CSSProperties}>
        <div className="rounded-[1.5rem] bg-[var(--brand-secondary)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-[var(--brand-primary)] text-white">
              {branding.logo_url ? <Image src={branding.logo_url} alt={`${organization.name} logo`} width={56} height={56} className="h-full w-full object-cover" /> : organization.name.slice(0, 1)}
            </div>
            <div><p className="text-sm font-semibold text-slate-950">{organization.name}</p><p className="text-xs text-slate-500">White-label preview</p></div>
          </div>
          <div className="mt-8 rounded-2xl bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-accent)]">Lead conversion</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Your branded operating system.</h3>
          </div>
        </div>
      </div>
    </form>
  );
}
