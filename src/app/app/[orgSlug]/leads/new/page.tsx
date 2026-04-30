import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLead } from "@/features/crm/actions";
import { getLeadList } from "@/lib/data/crm";

export default async function NewLeadPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const { tenant, members, stages } = await getLeadList(orgSlug);
  const action = createLead.bind(null, orgSlug);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <Card>
        <CardHeader>
          <CardTitle>Create traceable lead</CardTitle>
          <CardDescription>Lead Source Integrity is mandatory from the first CRM record. Phone/email are normalized into strong identity keys so duplicate intake paths cannot silently fork the same lead.</CardDescription>
          {query.error ? <p className="text-sm font-medium text-red-700">Lead creation failed: {query.error}</p> : null}
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="full_name">Lead name *</Label><Input id="full_name" name="full_name" required placeholder="Thandi Mokoena" /></div>
              <div className="space-y-2"><Label htmlFor="company">Company</Label><Input id="company" name="company" placeholder="Mokoena Family Trust" /></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" placeholder="lead@example.com" /></div>
              <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" placeholder="+27... or 082..." /></div>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Lead Source Integrity Doctrine</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2"><Label htmlFor="exact_source">Exact source *</Label><Input id="exact_source" name="exact_source" required placeholder="Property24 / Meta Ads / Referral" /></div>
                <div className="space-y-2"><Label htmlFor="source_subtype">Source subtype *</Label><Input id="source_subtype" name="source_subtype" required placeholder="valuation-form / buyer-lead" /></div>
                <div className="space-y-2"><Label htmlFor="original_inbound_channel">Inbound channel *</Label><Input id="original_inbound_channel" name="original_inbound_channel" required placeholder="dashboard_manual / whatsapp / web" /></div>
                <div className="space-y-2"><Label htmlFor="source_reference">Source reference</Label><Input id="source_reference" name="source_reference" placeholder="campaign/ad/form/id" /></div>
                <div className="space-y-2"><Label htmlFor="captured_at">Captured at</Label><Input id="captured_at" name="captured_at" type="datetime-local" /></div>
                <div className="space-y-2"><Label htmlFor="first_contact_at">First contact at</Label><Input id="first_contact_at" name="first_contact_at" type="datetime-local" /></div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="status">Status</Label><select id="status" name="status" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option></select></div>
              <div className="space-y-2"><Label htmlFor="priority">Priority</Label><select id="priority" name="priority" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></div>
              <div className="space-y-2"><Label htmlFor="qualification_status">Qualification</Label><select id="qualification_status" name="qualification_status" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="unqualified">Unqualified</option><option value="ai_review_pending">AI review pending</option><option value="ai_qualified">AI qualified</option><option value="human_qualified">Human qualified</option><option value="disqualified">Disqualified</option><option value="nurture">Nurture</option></select></div>
              <div className="space-y-2"><Label htmlFor="pipeline_stage_id">Pipeline stage</Label><select id="pipeline_stage_id" name="pipeline_stage_id" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Unstaged</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="assigned_owner_user_id">Assigned owner</Label><select id="assigned_owner_user_id" name="assigned_owner_user_id" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.user_id}>{member.profile?.full_name || member.profile?.email || member.user_id}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="estimated_value">Estimated value</Label><Input id="estimated_value" name="estimated_value" type="number" min="0" step="0.01" placeholder="25000" /></div>
            </section>

            <div className="space-y-2"><Label htmlFor="ai_qualification_decision_path">AI qualification decision path</Label><textarea id="ai_qualification_decision_path" name="ai_qualification_decision_path" rows={5} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder='[{"step":"manual_capture","decision":"awaiting_ai"}]' /></div>
            <Button type="submit" className="w-fit">Create lead</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
