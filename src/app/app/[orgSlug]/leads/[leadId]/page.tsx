import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addLeadNote, createLeadTask, updateLeadState } from "@/features/crm/actions";
import { displayMember, getLeadDetail } from "@/lib/data/crm";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export default async function LeadDetailPage({ params, searchParams }: { params: Promise<{ orgSlug: string; leadId: string }>; searchParams: Promise<{ saved?: string; created?: string; note?: string; task?: string; error?: string }> }) {
  const [{ orgSlug, leadId }, query] = await Promise.all([params, searchParams]);
  const { tenant, lead, notes, events, tasks, members, stages } = await getLeadDetail(orgSlug, leadId);
  const updateAction = updateLeadState.bind(null, orgSlug, lead.id);
  const noteAction = addLeadNote.bind(null, orgSlug, lead.id);
  const taskAction = createLeadTask.bind(null, orgSlug, lead.id);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-accent)]">Lead detail</p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{lead.full_name}</h2>
        <p className="mt-2 text-sm text-slate-600">{lead.email || lead.phone || lead.company || "Contact details pending"}</p>
        {query.error ? <p className="mt-3 text-sm font-medium text-red-700">Action failed: {query.error}</p> : null}
        {query.saved || query.created || query.note || query.task ? <p className="mt-3 text-sm font-medium text-emerald-700">Lead record updated.</p> : null}
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>{lead.status}</CardTitle><CardDescription>Status</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{displayMember(members, lead.assigned_owner_user_id)}</CardTitle><CardDescription>Assigned owner</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle>{lead.qualification_status}</CardTitle><CardDescription>Qualification</CardDescription></CardHeader></Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>State and assignment</CardTitle>
            <CardDescription>Changes here generate immutable lead events.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={lead.status} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="proposal">Proposal</option><option value="won">Won</option><option value="lost">Lost</option><option value="archived">Archived</option></select></div>
              <div className="space-y-2"><Label htmlFor="priority">Priority</Label><select id="priority" name="priority" defaultValue={lead.priority} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              <div className="space-y-2"><Label htmlFor="pipeline_stage_id">Pipeline stage</Label><select id="pipeline_stage_id" name="pipeline_stage_id" defaultValue={lead.pipeline_stage_id ?? ""} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Unstaged</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="assigned_owner_user_id">Assigned owner</Label><select id="assigned_owner_user_id" name="assigned_owner_user_id" defaultValue={lead.assigned_owner_user_id ?? ""} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.user_id}>{member.profile?.full_name || member.profile?.email || member.user_id}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="qualification_status">Qualification</Label><select id="qualification_status" name="qualification_status" defaultValue={lead.qualification_status} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="unqualified">Unqualified</option><option value="ai_review_pending">AI review pending</option><option value="ai_qualified">AI qualified</option><option value="human_qualified">Human qualified</option><option value="disqualified">Disqualified</option><option value="nurture">Nurture</option></select></div>
              <div className="space-y-2"><Label htmlFor="first_contact_at">First contact at</Label><Input id="first_contact_at" name="first_contact_at" type="datetime-local" /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="ai_qualification_decision_path">AI qualification decision path</Label><textarea id="ai_qualification_decision_path" name="ai_qualification_decision_path" rows={5} defaultValue={JSON.stringify(lead.ai_qualification_decision_path ?? [], null, 2)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm" /></div>
              <Button type="submit" className="w-fit">Save state</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Source integrity</CardTitle><CardDescription>Attribution fields preserved on the lead record.</CardDescription></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-slate-400">Exact source</p><p className="font-medium text-slate-900">{lead.exact_source}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-slate-400">Subtype / channel</p><p className="font-medium text-slate-900">{lead.source_subtype} / {lead.original_inbound_channel}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-slate-400">Captured / first contact</p><p className="font-medium text-slate-900">{formatDate(lead.captured_at)} / {formatDate(lead.first_contact_at)}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-slate-400">Source reference</p><p className="font-medium text-slate-900">{lead.source_reference || "None"}</p></div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle><CardDescription>Internal lead notes generate lead events.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <form action={noteAction} className="space-y-3"><textarea name="body" rows={4} required className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Add internal note..." /><Button type="submit" size="sm">Add note</Button></form>
            {notes.map((note) => <div key={note.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-700">{note.body}</p><p className="mt-2 text-xs text-slate-400">{formatDate(note.created_at)}</p></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lead tasks</CardTitle><CardDescription>Follow-up tasks stay scoped to the same organization.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <form action={taskAction} className="grid gap-3"><Input name="title" required placeholder="Call lead within 15 minutes" /><Input name="due_at" type="datetime-local" /><select name="assigned_to_user_id" className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.user_id}>{member.profile?.full_name || member.profile?.email || member.user_id}</option>)}</select><Button type="submit" size="sm" className="w-fit">Create task</Button></form>
            {tasks.map((task) => <div key={task.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-medium text-slate-900">{task.title}</p><p className="mt-1 text-sm text-slate-500">{task.status} • {task.due_at ? formatDate(task.due_at) : "No due date"}</p></div>)}
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader><CardTitle>Lead origin event trail</CardTitle><CardDescription>Generated history for attribution, assignment, qualification, notes, and tasks.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {events.map((event) => <div key={event.id} className="rounded-2xl border border-slate-200 p-4"><p className="font-medium text-slate-900">{event.event_type}</p><p className="mt-1 text-xs text-slate-400">{formatDate(event.created_at)}{event.field_name ? ` • ${event.field_name}` : ""}</p></div>)}
        </CardContent>
      </Card>
    </AppShell>
  );
}
