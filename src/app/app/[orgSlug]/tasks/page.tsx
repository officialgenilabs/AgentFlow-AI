import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLeadTaskStatus } from "@/features/crm/actions";
import { displayMember, getTaskList } from "@/lib/data/crm";

function fmt(value: string | null) {
  return value ? new Date(value).toLocaleString() : "No due date";
}

export default async function TasksPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const { tenant, tasks, members } = await getTaskList(orgSlug);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-accent)]">CRM Tasks</p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Task view</h2>
        <p className="mt-2 text-sm text-slate-600">Operational follow-ups for leads and agents.</p>
        {query.error ? <p className="mt-3 text-sm font-medium text-red-700">{query.error}</p> : null}
        {query.saved ? <p className="mt-3 text-sm font-medium text-emerald-700">Task updated.</p> : null}
      </div>

      <Card>
        <CardHeader><CardTitle>{tasks.length} tasks</CardTitle><CardDescription>Tenant-scoped task foundation, before inbox/conversations.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? <p className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No tasks yet.</p> : tasks.map((task) => {
            const action = updateLeadTaskStatus.bind(null, orgSlug, task.id);
            return (
              <div key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{task.leads ? <Link className="underline" href={`/app/${orgSlug}/leads/${task.lead_id}`}>{task.leads.full_name}</Link> : "General CRM task"} • {fmt(task.due_at)}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{task.priority} • {displayMember(members, task.assigned_to_user_id)}</p>
                  </div>
                  <form action={action} className="flex items-center gap-2">
                    <select name="status" defaultValue={task.status} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
                    <Button type="submit" size="sm">Save</Button>
                  </form>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </AppShell>
  );
}
