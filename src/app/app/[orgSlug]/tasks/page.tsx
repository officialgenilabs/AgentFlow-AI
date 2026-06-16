import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLeadTaskStatus } from "@/features/crm/actions";
import { displayMember, getTaskList } from "@/lib/data/crm";
import { Badge } from "@/components/ui/badge";

function fmt(value: string | null) {
  return value ? new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "No due date";
}

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "urgent": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "high": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "medium": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

export default async function TasksPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const { tenant, tasks, members } = await getTaskList(orgSlug);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
              Operational Follow-Ups
            </h1>
            <p className="text-sm text-[#888888]">
              Manage physical viewings, outbound calls, and administrative compliance gates.
            </p>
          </div>
        </div>

        {query.saved && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            Task status updated successfully.
          </div>
        )}

        {query.error && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 text-red-400 text-sm font-medium">
            Task mutation failed: {query.error}
          </div>
        )}

        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.06] pb-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-[#FAFAFA]">{tasks.length} Pending Tasks</CardTitle>
              <CardDescription className="text-[#888888] mt-1">
                Active instructions assigned across agents.
              </CardDescription>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-[#888888]">
              <span className="w-2 h-2 rounded-full bg-[#00E599] animate-pulse" />
              LIVE
            </span>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center text-sm text-[#888888]">
                No pending tasks assigned to this operational context.
              </div>
            ) : (
              tasks.map((task) => {
                const action = updateLeadTaskStatus.bind(null, orgSlug, task.id);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-white/[0.06] bg-[#161616]/40 p-5 hover:bg-[#1A1A1A]/80 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className="text-xs text-[#888888]">
                            Due: {fmt(task.due_at)}
                          </span>
                        </div>

                        <p className="font-bold text-[#FAFAFA] text-base">{task.title}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#888888]">
                          <span className="flex items-center gap-1">
                            Lead Reference:
                            {task.leads ? (
                              <Link
                                className="text-[#00E599] hover:underline font-semibold"
                                href={`/app/${orgSlug}/leads/${task.lead_id}`}
                              >
                                {task.leads.full_name}
                              </Link>
                            ) : (
                              "General CRM"
                            )}
                          </span>
                          <span>•</span>
                          <span>
                            Owner: <span className="text-[#FAFAFA] font-medium">{displayMember(members, task.assigned_to_user_id)}</span>
                          </span>
                        </div>
                      </div>

                      <form action={action} className="flex items-center gap-3">
                        <select
                          name="status"
                          defaultValue={task.status}
                          className="h-10 rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#FAFAFA] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E599]/50 transition-all"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <Button
                          type="submit"
                          className="bg-white/[0.06] border border-white/[0.08] text-[#FAFAFA] hover:bg-white/[0.12] transition-colors"
                        >
                          Update
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
