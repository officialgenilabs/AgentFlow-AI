import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayMember, getLeadList } from "@/lib/data/crm";

export default async function LeadsPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const { tenant, leads, members, stages } = await getLeadList(orgSlug);
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-accent)]">CRM Core</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Leads</h2>
          <p className="mt-2 text-sm text-slate-600">Traceable lead attribution, assignment, and conversion state.</p>
        </div>
        <Button asChild><Link href={`/app/${orgSlug}/leads/new`}><Plus className="size-4" /> New lead</Link></Button>
      </div>

      {query.error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{query.error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Lead pipeline foundation</CardTitle>
          <CardDescription>{leads.length} active CRM records across {stages.length} pipeline stages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-medium text-slate-800">No leads yet.</p>
              <p className="mt-2 text-sm text-slate-500">Create the first traceable lead before inbox/conversations come online.</p>
            </div>
          ) : leads.map((lead) => {
            const stage = lead.pipeline_stage_id ? stageById.get(lead.pipeline_stage_id) : null;
            return (
              <Link key={lead.id} href={`/app/${orgSlug}/leads/${lead.id}`} className="block rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{lead.full_name}</h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">{lead.status}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase text-amber-700">{lead.qualification_status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{lead.email || lead.phone || lead.company || "No contact detail captured"}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{lead.exact_source} / {lead.source_subtype} / {lead.original_inbound_channel}</p>
                  </div>
                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3 lg:min-w-[520px]">
                    <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Stage</p><p className="font-medium text-slate-800">{stage?.name ?? "Unstaged"}</p></div>
                    <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Owner</p><p className="font-medium text-slate-800">{displayMember(members, lead.assigned_owner_user_id)}</p></div>
                    <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Captured</p><p className="font-medium text-slate-800">{new Date(lead.captured_at).toLocaleDateString()}</p></div>
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </AppShell>
  );
}
