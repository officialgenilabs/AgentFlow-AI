import { AppShell } from "@/components/layout/shell";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/data/auth";
import { isDemoMode } from "@/lib/demo/config";
import { demoMetrics, demoGovernance } from "@/lib/demo/data";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  Clock,
  Activity,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  Cpu
} from "lucide-react";

export default async function AdminDashboardPage() {
  const profile = await requirePlatformAdmin();

  let orgCount = 0;
  let memberCount = 0;
  let uptime = "99.98%";
  let avgLatency = "2m 34s";
  let activeAuditTrail: { timestamp: string; event: string; actor: string }[] = [];

  if (isDemoMode()) {
    orgCount = 1;
    memberCount = 1;
    uptime = `${demoMetrics.healthScore}%`;
    avgLatency = demoMetrics.avgResponseTime;
    activeAuditTrail = demoGovernance.auditTrail;
  } else {
    const supabase = await createClient();
    const [{ count: oCount }, { count: mCount }] = await Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("organization_members").select("id", { count: "exact", head: true }),
    ]);

    orgCount = oCount ?? 0;
    memberCount = mCount ?? 0;
    activeAuditTrail = [
      { timestamp: new Date().toISOString(), event: "System dashboard loaded by platform admin", actor: profile.full_name || "Admin" }
    ];
  }

  return (
    <AppShell profile={profile} mode="admin">
      <div className="space-y-6">

        {/* Row 1: Primary Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Configured Tenants"
            value={orgCount}
            description="Active multi-tenant organizations"
            icon={<Building className="size-4" />}
          />
          <MetricCard
            title="User Membership Records"
            value={memberCount}
            description="Active operator access records"
            icon={<Users className="size-4" />}
          />
          <MetricCard
            title="Global System Latency"
            value={avgLatency}
            description="Avg outbound response generation"
            glow={isDemoMode()}
            icon={<Clock className="size-4 text-[#00E599]" />}
          />
          <MetricCard
            title="Infrastructure Health"
            value={uptime}
            description="Real-time multi-agent runtime score"
            icon={<Activity className="size-4 text-[#6C63FF]" />}
          />
        </div>

        {/* Row 2: Controls & Status Indicator */}
        <div className="grid gap-6 md:grid-cols-3">

          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl md:col-span-2 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute -left-16 -top-16 w-32 h-32 bg-[#00E599] rounded-full blur-[80px] opacity-10 pointer-events-none" />
            <CardHeader className="border-b border-white/[0.04] pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Founder Control Layer</CardTitle>
                  <CardDescription className="text-xs">
                    Platform orchestrator. Seed, manage, and scale sandboxed organizations.
                  </CardDescription>
                </div>
                <Badge variant="mint">
                  <ShieldCheck className="size-3 mr-1" /> Governance Guard Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-xs leading-relaxed text-white/60">
                Tenant configuration is secured via strict platform-level role authorization. Keep all first-client demonstrations and operations governed in staging nodes. No public self-signup vectors are enabled on the edge.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild className="bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl shadow-[0_0_15px_rgba(0,229,153,0.15)]">
                  <Link href="/admin/tenants/new">
                    Configure New Tenant <ArrowUpRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="bg-white/[0.03] border-white/[0.06] text-white hover:bg-white/[0.06] rounded-xl">
                  <Link href="/admin/tenants">
                    Manage Tenant Accounts
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status Panel */}
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl flex flex-col justify-between">
            <CardHeader className="pb-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#6C63FF] uppercase">
                ENGINE STATE
              </span>
              <CardTitle className="text-base mt-1">Infrastructure Status</CardTitle>
              <CardDescription className="text-xs">
                Real-time connection interfaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.03]">
                  <span className="text-white/50 font-medium">Supabase Database Connection</span>
                  <StatusIndicator status={isDemoMode() ? "offline" : "active"} label={isDemoMode() ? "Demo Intercept" : "CONNECTED"} pulse={!isDemoMode()} />
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.03]">
                  <span className="text-white/50 font-medium">Ingress Webhook Nodes</span>
                  <StatusIndicator status="active" label="OPERATIONAL" pulse={isDemoMode()} />
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.03]">
                  <span className="text-white/50 font-medium">WhatsApp Dispatch Gateway</span>
                  <StatusIndicator status="active" label="STANDBY" pulse={false} />
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-white/50 font-medium">Platform Schema Migrations</span>
                  <span className="font-mono text-[10px] font-bold text-white/70">Stage C (v5)</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Row 3: Audit Trail Log */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="text-sm">Platform Audit Ledger</CardTitle>
            <CardDescription className="text-xs">
              System governance events captured across all tenant modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3 font-mono text-[11px] leading-relaxed">
              {activeAuditTrail.map((log, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-start justify-between p-2 rounded-lg bg-white/[0.01] border border-white/[0.03] gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#00E599] font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-white/80">{log.event}</span>
                  </div>
                  <span className="text-white/40 uppercase text-[9px] shrink-0 font-bold tracking-wider px-2 py-0.5 rounded border border-white/[0.04] bg-white/[0.02]">
                    Actor: {log.actor}
                  </span>
                </div>
              ))}
              {activeAuditTrail.length === 0 && (
                <p className="text-xs text-white/40 text-center py-4">No events captured in this cycle.</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
