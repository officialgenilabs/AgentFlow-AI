import Link from "next/link";
import Image from "next/image";
import { Building2, LayoutDashboard, Palette, ShieldCheck, Sparkles } from "lucide-react";
import type { Organization, OrganizationBranding, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function BrandMark({ organization, branding }: { organization?: Organization; branding?: OrganizationBranding }) {
  const name = organization?.name ?? "AgentFlow AI";
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
        {branding?.logo_url ? (
          <Image src={branding.logo_url} alt={`${name} logo`} width={44} height={44} className="h-full w-full object-cover" />
        ) : (
          <Sparkles className="size-5 text-[var(--brand-accent)]" />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-950">{name}</p>
        <p className="text-xs text-slate-500">Lead conversion OS</p>
      </div>
    </div>
  );
}

export function AppShell({ children, organization, branding, profile, mode = "tenant" }: { children: React.ReactNode; organization?: Organization; branding?: OrganizationBranding; profile: Profile; mode?: "tenant" | "admin" }) {
  const tenantHref = organization ? `/app/${organization.slug}` : "/select-organization";
  const nav = mode === "admin"
    ? [
        { href: "/admin/dashboard", label: "Founder Dashboard", icon: ShieldCheck },
        { href: "/admin/tenants", label: "Tenants", icon: Building2 },
      ]
    : [
        { href: `${tenantHref}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
        { href: `${tenantHref}/branding`, label: "Branding", icon: Palette },
      ];

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,169,106,0.14),_transparent_28%),linear-gradient(135deg,#f8fafc_0%,#eef2f7_55%,#f7f3ea_100%)]"
      style={{
        "--brand-primary": branding?.primary_color ?? "#111827",
        "--brand-secondary": branding?.secondary_color ?? "#f8fafc",
        "--brand-accent": branding?.accent_color ?? "#c8a96a",
      } as React.CSSProperties}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 p-4 lg:p-6">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl lg:block">
          <BrandMark organization={organization} branding={branding} />
          <nav className="mt-10 space-y-2">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-950 hover:text-white") }>
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--brand-accent)]">Managed SaaS</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">Premium lead conversion infrastructure, configured and monitored by Gen I Labs.</p>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="mb-6 flex items-center justify-between rounded-[2rem] border border-white/70 bg-white/75 px-5 py-4 shadow-sm backdrop-blur-xl">
            <div className="lg:hidden"><BrandMark organization={organization} branding={branding} /></div>
            <div className="hidden lg:block">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">AgentFlow AI</p>
              <h1 className="text-xl font-semibold text-slate-950">{mode === "admin" ? "Founder Control" : organization?.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm"><Link href="/select-organization"><Building2 className="size-4" /> Switch</Link></Button>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">{profile.email}</div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
