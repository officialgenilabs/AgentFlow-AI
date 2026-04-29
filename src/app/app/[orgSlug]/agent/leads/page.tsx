import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayMember, getLeadList } from "@/lib/data/crm";

export default async function AgentLeadViewPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { tenant, leads, members } = await getLeadList(orgSlug);
  const myLeads = leads.filter((lead) => lead.assigned_owner_user_id === tenant.profile.id);
  const visibleLeads = myLeads.length ? myLeads : leads;

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-accent)]">Agent lead view</p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Conversion focus list</h2>
        <p className="mt-2 text-sm text-slate-600">Agent-first view for assigned leads. If no leads are assigned to you yet, the tenant lead queue is shown.</p>
      </div>

      <section className="grid gap-5 md:grid-cols-3">
        <Card><CardHeader><CardTitle>{myLeads.length}</CardTitle><CardDescription>Assigned to you</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{leads.filter((lead) => lead.status === "new").length}</CardTitle><CardDescription>New leads</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{leads.filter((lead) => ["ai_qualified", "human_qualified"].includes(lead.qualification_status)).length}</CardTitle><CardDescription>Qualified leads</CardDescription></CardHeader></Card>
      </section>

      <Card className="mt-6">
        <CardHeader><CardTitle>Next best lead queue</CardTitle><CardDescription>Prioritized by urgency and capture recency.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {visibleLeads.map((lead) => (
            <Link key={lead.id} href={`/app/${orgSlug}/leads/${lead.id}`} className="block rounded-3xl border border-slate-200 p-5 transition hover:border-slate-400">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-slate-950">{lead.full_name}</p><p className="mt-1 text-sm text-slate-500">{lead.exact_source} / {lead.source_subtype} / {lead.original_inbound_channel}</p></div>
                <div className="text-sm text-slate-500"><p>{lead.priority} priority</p><p>{displayMember(members, lead.assigned_owner_user_id)}</p></div>
              </div>
            </Link>
          ))}
          {visibleLeads.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No leads ready for agent view.</p> : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
