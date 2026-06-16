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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans">
            Register Traceable Lead
          </h1>
          <p className="text-sm text-[#888888]">
            Ingest a new participant into the autonomous CRM flow.
          </p>
        </div>

        <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.06] pb-6">
            <CardTitle className="text-lg font-bold text-[#FAFAFA]">Lead Parameters</CardTitle>
            <CardDescription className="text-[#888888] mt-1">
              Lead Source Integrity is mandatory. Phone and email are normalized into cryptographic identity keys so duplicate intake paths cannot silently fork the same lead.
            </CardDescription>
            {query.error ? (
              <p className="text-sm font-medium text-red-400 mt-2 bg-red-950/30 border border-red-500/20 px-3 py-2 rounded-xl">
                Lead registration failed: {query.error}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="pt-6">
            <form action={action} className="grid gap-8">
              <section className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Lead name *</Label>
                  <Input id="full_name" name="full_name" required placeholder="Thandi Mokoena" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Company</Label>
                  <Input id="company" name="company" placeholder="Mokoena Family Trust" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="lead@example.com" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+27... or 082..." className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                </div>
              </section>

              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] backdrop-blur-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-400">Lead Source Integrity Doctrine</p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="exact_source" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Exact source *</Label>
                    <Input id="exact_source" name="exact_source" required placeholder="Property24 / Meta Ads" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source_subtype" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Source subtype *</Label>
                    <Input id="source_subtype" name="source_subtype" required placeholder="valuation-form / buyer-lead" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_inbound_channel" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Inbound channel *</Label>
                    <Input id="original_inbound_channel" name="original_inbound_channel" required placeholder="dashboard_manual / whatsapp" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source_reference" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Source reference</Label>
                    <Input id="source_reference" name="source_reference" placeholder="campaign/ad/form/id" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="captured_at" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Captured at</Label>
                    <Input id="captured_at" name="captured_at" type="datetime-local" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_contact_at" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">First contact at</Label>
                    <Input id="first_contact_at" name="first_contact_at" type="datetime-local" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                  </div>
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Status</Label>
                  <select id="status" name="status" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#FAFAFA] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E599]/50 transition-all duration-200">
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Priority</Label>
                  <select id="priority" name="priority" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#FAFAFA] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E599]/50 transition-all duration-200">
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification_status" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Qualification</Label>
                  <select id="qualification_status" name="qualification_status" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#FAFAFA] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E599]/50 transition-all duration-200">
                    <option value="unqualified">Unqualified</option>
                    <option value="ai_review_pending">AI review pending</option>
                    <option value="ai_qualified">AI qualified</option>
                    <option value="human_qualified">Human qualified</option>
                    <option value="disqualified">Disqualified</option>
                    <option value="nurture">Nurture</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pipeline_stage_id" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Pipeline stage</Label>
                  <select id="pipeline_stage_id" name="pipeline_stage_id" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#FAFAFA] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E599]/50 transition-all duration-200">
                    <option value="">Unstaged</option>
                    {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_owner_user_id" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Assigned owner</Label>
                  <select id="assigned_owner_user_id" name="assigned_owner_user_id" className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#FAFAFA] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E599]/50 transition-all duration-200">
                    <option value="">Unassigned</option>
                    {members.map((member) => <option key={member.id} value={member.user_id}>{member.profile?.full_name || member.profile?.email || member.user_id}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_value" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Estimated value (ZAR)</Label>
                  <Input id="estimated_value" name="estimated_value" type="number" min="0" step="0.01" placeholder="25000" className="bg-[#1A1A1A] border-white/[0.08] text-[#FAFAFA] focus:ring-2 focus:ring-[#00E599]/50" />
                </div>
              </section>

              <div className="space-y-2">
                <Label htmlFor="ai_qualification_decision_path" className="text-xs font-semibold uppercase tracking-wider text-[#888888]">AI qualification decision path</Label>
                <textarea id="ai_qualification_decision_path" name="ai_qualification_decision_path" rows={4} className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-[#FAFAFA] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E599]/50 transition-all duration-200" placeholder='[{"step":"manual_capture","decision":"awaiting_ai"}]' />
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.06]">
                <Button type="submit" className="w-fit bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90 font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-[#00E599]/10">
                  Register Intake Record
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
