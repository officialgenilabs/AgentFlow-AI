import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requirePlatformAdmin } from "@/lib/data/auth";

export default async function NewTenantPage() {
  const profile = await requirePlatformAdmin();

  return (
    <AppShell profile={profile} mode="admin">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
            Provision Tenant Sandbox
          </h1>
          <p className="text-sm text-[#888888]">
            Deploy a new organization instance into the isolated staging database layer.
          </p>
        </div>

        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.06] pb-5">
            <CardTitle className="text-lg font-bold text-[#FAFAFA]">Sandbox Parameters</CardTitle>
            <CardDescription className="text-[#888888] mt-1">
              Founder-only setup for controlled client pilots. Tenant rows are created within authenticated admin context and immediately locked under Row-Level Security rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form action="/admin/tenants/create" method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Organization Name
                </Label>
                <Input 
                  id="name" 
                  name="name" 
                  required 
                  placeholder="Demo Realty Group" 
                  className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Workplace Routing Slug
                </Label>
                <Input 
                  id="slug" 
                  name="slug" 
                  placeholder="demo-realty-group" 
                  className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" 
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-white/[0.06]">
                <div className="space-y-2">
                  <Label htmlFor="primary_color" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Primary Color</Label>
                  <div className="flex gap-2 items-center bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 px-2 h-10">
                    <input id="primary_color" name="primary_color" type="color" defaultValue="#111827" className="w-6 h-6 border-0 rounded-md bg-transparent cursor-pointer" />
                    <span className="text-xs text-[#FAFAFA] font-mono">#111827</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondary_color" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Surface Color</Label>
                  <div className="flex gap-2 items-center bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 px-2 h-10">
                    <input id="secondary_color" name="secondary_color" type="color" defaultValue="#f8fafc" className="w-6 h-6 border-0 rounded-md bg-transparent cursor-pointer" />
                    <span className="text-xs text-[#FAFAFA] font-mono">#F8FAFC</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accent_color" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Accent Color</Label>
                  <div className="flex gap-2 items-center bg-[#1A1A1A] border border-white/[0.08] rounded-xl p-1 px-2 h-10">
                    <input id="accent_color" name="accent_color" type="color" defaultValue="#c8a96a" className="w-6 h-6 border-0 rounded-md bg-transparent cursor-pointer" />
                    <span className="text-xs text-[#FAFAFA] font-mono">#C8A96A</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.06]">
                <Button type="submit" className="bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90 font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-[#00E599]/10">
                  Provision Isolated Tenant
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
