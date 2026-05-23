import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadList } from "@/lib/data/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KanbanSquare } from "lucide-react";

export default async function DemoLeadsPage() {
  const orgSlug = "boutique-properties";
  const { tenant, leads } = await getLeadList(orgSlug, true);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
              <KanbanSquare className="h-6 w-6 text-[#00E599]" />
              Lead Memory Pipeline
            </h1>
            <p className="text-sm text-[#888888]">
              Monitor CRM leads, source integrity markers, and autonomous qualification checks.
            </p>
          </div>
          <Button asChild className="bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90 font-semibold rounded-xl">
            <Link href="/demo/leads/new">Create Traceable Lead</Link>
          </Button>
        </div>

        <div className="grid gap-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <CardTitle className="text-lg font-bold text-[#FAFAFA]">{lead.full_name}</CardTitle>
                    <Badge variant={lead.priority === "urgent" ? "error" : lead.priority === "high" ? "warning" : "neutral"}>
                      {lead.priority}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-[#888888]">
                    Source: <span className="font-mono text-white/60">{lead.exact_source}</span> • Status: <span className="text-[#00E599] uppercase font-bold">{lead.qualification_status}</span>
                  </CardDescription>
                </div>
                <Button asChild variant="outline" className="border-white/[0.08] hover:bg-white/[0.06] text-[#FAFAFA] rounded-xl" size="sm">
                  <Link href={`/demo/leads/${lead.id}`}>Open CRM Profile</Link>
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
