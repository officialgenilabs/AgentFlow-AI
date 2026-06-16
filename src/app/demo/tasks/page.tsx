import { AppShell } from "@/components/layout/shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskList } from "@/lib/data/crm";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function DemoTasksPage() {
  const orgSlug = "boutique-properties";
  const { tenant, tasks } = await getTaskList(orgSlug, true);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-[#00E599]" />
            Operator Tasks
          </h1>
          <p className="text-sm text-[#888888]">
            Track manual actions, follow-up alerts, and verification tasks assigned to operator nodes.
          </p>
        </div>

        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-white">{task.title}</CardTitle>
                    <Badge variant={task.priority === "urgent" ? "error" : task.priority === "high" ? "warning" : "neutral"}>
                      {task.priority}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-[#888888]">
                    {task.description}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest bg-white/[0.02] border border-white/[0.04] px-2.5 py-1 rounded-full">
                    Due: {new Date(task.due_at || "").toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
