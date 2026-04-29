import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/data/auth";

export default async function TenantDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);
  const supabase = await createClient();
  const [{ count: leadCount }, { count: openTaskCount }, { data: recentLeads }, { data: pipeline }] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id),
    supabase.from("lead_tasks").select("id", { count: "exact", head: true }).eq("organization_id", tenant.organization.id).in("status", ["open", "in_progress"]),
    supabase.from("leads").select("id, full_name, status, qualification_status, exact_source, source_subtype, original_inbound_channel, created_at").eq("organization_id", tenant.organization.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("lead_pipeline_stages").select("id, name, slug, probability, position").eq("organization_id", tenant.organization.id).order("position", { ascending: true }),
  ]);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <section className="grid gap-5 md:grid-cols-3">
        <Card><CardHeader><CardTitle>{leadCount ?? 0}</CardTitle><CardDescription>Total leads captured</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{openTaskCount ?? 0}</CardTitle><CardDescription>Open CRM tasks</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{pipeline?.length ?? 0}</CardTitle><CardDescription>Pipeline stages online</CardDescription></CardHeader></Card>
      </section>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Conversion operating system</CardTitle>
          <CardDescription>CRM Core is tenant-scoped with source integrity, assignment, events, and task foundation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[2rem] border border-slate-200 bg-[var(--brand-secondary)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-accent)]">{tenant.organization.name}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Lead attribution you can trust.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Every lead preserves exact source, source subtype, original channel, capture timing, qualification state, AI decision path, assigned owner, and generated origin event trail.</p>
            <div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link href={`/app/${orgSlug}/leads/new`}>Create traceable lead</Link></Button><Button asChild variant="secondary"><Link href={`/app/${orgSlug}/leads`}>View pipeline</Link></Button></div>
          </div>
        </CardContent>
      </Card>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Recent leads</CardTitle><CardDescription>Latest source-attributed CRM records.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {(recentLeads ?? []).map((lead) => (
              <Link key={lead.id} href={`/app/${orgSlug}/leads/${lead.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:border-slate-400">
                <p className="font-medium text-slate-950">{lead.full_name}</p>
                <p className="mt-1 text-sm text-slate-500">{lead.status} • {lead.qualification_status}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{lead.exact_source} / {lead.source_subtype} / {lead.original_inbound_channel}</p>
              </Link>
            ))}
            {(recentLeads ?? []).length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No leads captured yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pipeline foundation</CardTitle><CardDescription>Default conversion stages seeded per organization.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {(pipeline ?? []).map((stage) => <div key={stage.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"><span className="font-medium text-slate-900">{stage.name}</span><span className="text-sm text-slate-500">{stage.probability}%</span></div>)}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
