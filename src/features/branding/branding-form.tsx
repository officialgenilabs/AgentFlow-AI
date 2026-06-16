import Image from "next/image";
import { updateBranding } from "@/features/branding/actions";
import type { Organization, OrganizationBranding } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrandingForm({ organization, branding }: { organization: Organization; branding: OrganizationBranding }) {
  const action = updateBranding.bind(null, organization.slug);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6 rounded-2xl border border-white/[0.06] bg-[#111111]/80 backdrop-blur-xl p-6">
        <div className="space-y-2">
          <Label htmlFor="logo" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Tenant Logo Mark
          </Label>
          <div className="relative flex items-center justify-center border border-dashed border-white/[0.08] hover:border-white/[0.15] bg-[#1A1A1A] rounded-xl p-6 transition-all duration-200 cursor-pointer group">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-center space-y-1">
              <svg className="mx-auto h-8 w-8 text-[#888888] group-hover:text-[#FAFAFA] transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs font-medium text-[#E5E5E5] group-hover:text-[#FAFAFA] transition-colors">Click to upload brand logo</p>
              <p className="text-[10px] text-[#888888]">PNG, JPG, SVG up to 2MB</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
          <div className="space-y-2">
            <Label htmlFor="primary_color" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Primary Color</Label>
            <div className="flex gap-2 items-center bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 px-2 h-10">
              <input id="primary_color" name="primary_color" type="color" defaultValue={branding.primary_color} className="w-6 h-6 border-0 rounded-md bg-transparent cursor-pointer" />
              <span className="text-xs text-[#FAFAFA] font-mono">{branding.primary_color}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_color" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Surface Color</Label>
            <div className="flex gap-2 items-center bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 px-2 h-10">
              <input id="secondary_color" name="secondary_color" type="color" defaultValue={branding.secondary_color} className="w-6 h-6 border-0 rounded-md bg-transparent cursor-pointer" />
              <span className="text-xs text-[#FAFAFA] font-mono">{branding.secondary_color}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent_color" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Accent Color</Label>
            <div className="flex gap-2 items-center bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 px-2 h-10">
              <input id="accent_color" name="accent_color" type="color" defaultValue={branding.accent_color} className="w-6 h-6 border-0 rounded-md bg-transparent cursor-pointer" />
              <span className="text-xs text-[#FAFAFA] font-mono">{branding.accent_color}</span>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90 font-semibold h-11 rounded-xl mt-4">
          Persist Operational Brand Config
        </Button>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#111111]/80 backdrop-blur-xl p-6 flex flex-col justify-between" style={{ "--brand-primary": branding.primary_color, "--brand-secondary": branding.secondary_color, "--brand-accent": branding.accent_color } as React.CSSProperties}>
        <div className="space-y-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Interactive White-Label Preview
          </Label>

          <div className="rounded-2xl bg-[var(--brand-secondary)] border border-white/[0.04] p-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-[var(--brand-primary)] text-[#FAFAFA] font-sans font-bold shadow-lg">
                {branding.logo_url ? (
                  <Image src={branding.logo_url} alt={`${organization.name} logo`} width={48} height={48} className="h-full w-full object-cover" />
                ) : (
                  organization.name.slice(0, 1)
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#FAFAFA]">{organization.name}</p>
                <p className="text-[10px] text-[#888888] uppercase tracking-wider">Dynamic Tenant Preview</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#1A1A1A]/80 border border-white/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--brand-accent)]">
                Intelligent Ingress
              </p>
              <h3 className="mt-1.5 text-lg font-bold text-[#FAFAFA] font-sans">
                Branded Operational Environment
              </h3>
              <p className="text-xs text-[#888888] mt-1 leading-relaxed">
                Your organizational context is dynamically injected across all conversational pipelines and customer-facing interfaces.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06] mt-6 flex justify-between items-center text-[10px] text-[#888888]">
          <span>RENDER LAYER: WHITE-LABEL v1.0</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E599] animate-pulse" />
            LIVE COMPOSE
          </span>
        </div>
      </div>
    </form>
  );
}
