"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import {
  Building2,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Palette,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  GitBranch,
  CalendarDays,
  Lock,
  Eye,
  Layers,
  HelpCircle,
  Menu,
  X,
  LogOut
} from "lucide-react";
import type { Organization, OrganizationBranding, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoFull, LogoMark } from "@/components/brand/logo";
import { StatusIndicator } from "@/components/ui/status-indicator";

function BrandMark({ organization, branding }: { organization?: Organization; branding?: OrganizationBranding }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={36} glow={false} className="shrink-0" />
      <div className="select-none text-left">
        <p className="text-sm font-heading font-extrabold tracking-wide text-white leading-none">
          AGENTFLOW <span className="text-[#00E599]">AI</span>
        </p>
        <p className="text-[10px] tracking-wider text-white/40 mt-1 uppercase leading-none font-medium">
          Operational Intelligence
        </p>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  organization,
  branding,
  profile,
  mode = "tenant"
}: {
  children: React.ReactNode;
  organization?: Organization;
  branding?: OrganizationBranding;
  profile: Profile;
  mode?: "tenant" | "admin" | "demo"
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tenantHref = mode === "demo" ? "/demo" : (organization ? `/app/${organization.slug}` : "/select-organization");

  const nav = mode === "admin"
    ? [
        { href: "/admin/dashboard", label: "Founder Control", icon: ShieldCheck },
        { href: "/admin/tenants", label: "Tenants", icon: Building2 },
      ]
    : [
        { href: `${tenantHref}/dashboard`, label: "Operations Cockpit", icon: LayoutDashboard },
        { href: `${tenantHref}/inbox`, label: "Governed Inbound Queue", icon: Inbox },
        { href: `${tenantHref}/approvals`, label: "Governed Approvals", icon: ShieldCheck },
        { href: `${tenantHref}/leads`, label: "Context Memory Ledger", icon: KanbanSquare },
        { href: `${tenantHref}/routing`, label: "Synthetic Routing Flow", icon: GitBranch },
        { href: `${tenantHref}/calendar`, label: "Viewing Calendar", icon: CalendarDays },
        { href: `${tenantHref}/tasks`, label: "Operator Follow-ups", icon: ListChecks },
        { href: `${tenantHref}/governance`, label: "Outbound Governance", icon: Lock },
        { href: `${tenantHref}/branding`, label: "Branding Parameters", icon: Palette },
        { href: `${tenantHref}/positioning`, label: "Wedge Positioning", icon: Layers },
        { href: `${tenantHref}/vision`, label: "Vision Roadmap", icon: Eye },
      ];

  const isActive = (href: string) => {
    if (href === "/select-organization") return pathname === href;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <div
      className="min-h-screen bg-[#050505] text-[#FAFAFA] relative overflow-hidden flex flex-col"
      style={{
        "--brand-primary": branding?.primary_color ?? "#00E599",
        "--brand-secondary": branding?.secondary_color ?? "#6C63FF",
        "--brand-accent": branding?.accent_color ?? "#00E599",
      } as React.CSSProperties}
    >
      {/* Background Cinematic Orbs */}
      <div className="absolute -left-40 -top-40 w-96 h-96 bg-[#00E599] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-[#6C63FF] rounded-full blur-[140px] opacity-8 pointer-events-none" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 p-4 lg:p-6 flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-white/[0.06] bg-[#111111]/85 p-6 backdrop-blur-xl lg:flex lg:flex-col justify-between shadow-2xl">
          <div>
            <BrandMark organization={organization} branding={branding} />
            <nav className="mt-8 space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {nav.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all duration-200 select-none border border-transparent",
                      active
                        ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20"
                        : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    <item.icon className={cn("size-4", active ? "text-[#00E599]" : "text-white/40")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className={cn(
            "mt-6 rounded-2xl border p-4 relative overflow-hidden select-none",
            mode === "demo"
              ? "border-[#00E599]/20 bg-[#00E599]/5"
              : "border-[#6C63FF]/20 bg-[#6C63FF]/5"
          )}>
            <div className="absolute right-2 top-2">
              <StatusIndicator status="active" pulse={mode === "demo"} />
            </div>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em]",
              mode === "demo" ? "text-[#00E599]" : "text-[#A29EFF]"
            )}>{mode === "demo" ? "Simulation Active" : "Gen I Labs"}</p>
            <p className="mt-2 text-xs leading-5 text-white/70 font-medium">
              {mode === "demo"
                ? "Interactive guided demonstration. All database operations are synthetic."
                : "Human-supervised AI routing active. Outbound governance layer engaged."}
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 flex flex-col">
          {/* Header */}
          <header className="mb-6 flex items-center justify-between rounded-[2rem] border border-white/[0.06] bg-[#111111]/80 px-6 py-4 shadow-xl backdrop-blur-xl">
            <div className="lg:hidden">
              <BrandMark organization={organization} branding={branding} />
            </div>

            <div className="hidden lg:block select-none text-left">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-bold">
                {mode === "admin" ? "Founder Context" : mode === "demo" ? "Simulation Layer" : "Tenant Operations"}
              </p>
              <h1 className="text-xl font-heading font-extrabold text-white mt-1">
                {mode === "admin" ? "Founder Cockpit" : mode === "demo" ? "Sandton Operations Sandbox" : organization?.name}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <StatusIndicator status="active" pulse={false} label={mode === "demo" ? "SIMULATOR" : "LIVE RUNTIME"} className="hidden sm:flex" />
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href={mode === "demo" ? "/demo" : "/select-organization"}>
                  <Building2 className="size-4 mr-2" /> {mode === "demo" ? "Restart Demo" : "Contexts"}
                </Link>
              </Button>
              <div className="rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-xs font-mono font-bold text-white/70 tracking-tight">
                {profile.email}
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>
          </header>

          {/* Children Viewport */}
          <div className="flex-1 flex flex-col relative z-10">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-md flex flex-col p-6 lg:hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <BrandMark organization={organization} branding={branding} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-white/70 hover:text-white"
              aria-label="Close Menu"
            >
              <X className="size-6" />
            </button>
          </div>

          <nav className="mt-8 space-y-1.5 overflow-y-auto flex-1">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all border border-transparent",
                    active
                      ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20"
                      : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                  )}
                >
                  <item.icon className={cn("size-4", active ? "text-[#00E599]" : "text-white/40")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/[0.06] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <StatusIndicator status="active" pulse={false} label={mode === "demo" ? "SIMULATOR" : "LIVE RUNTIME"} />
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href={mode === "demo" ? "/demo" : "/select-organization"} onClick={() => setMobileMenuOpen(false)}>
                  <Building2 className="size-4 mr-2" /> {mode === "demo" ? "Restart Demo" : "Contexts"}
                </Link>
              </Button>
            </div>
            <div className="rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A29EFF]">Gen I Labs</p>
              <p className="mt-1 text-xs text-white/60 leading-5">
                Human-supervised AI routing engaged.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
