import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeadQualificationSummaryCard } from "@/components/leads/lead-qualification-summary-card";
import { addLeadNote, createLeadTask, updateLeadState } from "@/features/crm/actions";
import { displayMember, getLeadDetail } from "@/lib/data/crm";
import { buildLeadQualificationSummary } from "@/lib/data/qualification";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import {
  ShieldCheck,
  User,
  CheckCircle,
} from "lucide-react";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not set";
}

export default async function LeadDetailPage({ params, searchParams }: { params: Promise<{ orgSlug: string; leadId: string }>; searchParams: Promise<{ saved?: string; created?: string; note?: string; task?: string; error?: string }> }) {
  const [{ orgSlug, leadId }, query] = await Promise.all([params, searchParams]);
  const { tenant, lead, notes, events, tasks, members, stages } = await getLeadDetail(orgSlug, leadId);
  const updateAction = updateLeadState.bind(null, orgSlug, lead.id);
  const noteAction = addLeadNote.bind(null, orgSlug, lead.id);
  const taskAction = createLeadTask.bind(null, orgSlug, lead.id);
  const leadStage = lead.pipeline_stage_id ? stages.find((stage) => stage.id === lead.pipeline_stage_id) : null;
  const qualificationSummary = buildLeadQualificationSummary(lead, leadStage, tasks);

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#00E599] uppercase">
            LEAD RECORD CONTAINER
          </span>
          <h2 className="text-3xl font-heading font-extrabold text-white mt-1">{lead.full_name}</h2>
          <p className="mt-2 text-xs text-white/50 leading-relaxed uppercase tracking-wider">
            {lead.email || lead.phone || lead.company || "Contact details pending"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {query.error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">
              ERROR: {query.error}
            </div>
          )}
          {(query.saved || query.created || query.note || query.task) && (
            <div className="rounded-xl border border-[#00E599]/20 bg-[#00E599]/5 px-3 py-1.5 text-[10px] font-mono font-bold text-[#00E599] uppercase tracking-wider">
              SUCCESS: RECORD CONTEXT SYNCHRONIZED
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <section className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                OPERATIONAL STATE
              </span>
              <CardTitle className="text-sm font-heading font-extrabold uppercase text-white mt-1">
                {lead.status}
              </CardTitle>
            </div>
            <StatusIndicator status="active" pulse={false} />
          </CardHeader>
        </Card>

        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                ASSIGNED OWNER
              </span>
              <CardTitle className="text-sm font-heading font-extrabold text-white mt-1 truncate max-w-[180px]">
                {displayMember(members, lead.assigned_owner_user_id)}
              </CardTitle>
            </div>
            <User className="size-4 text-[#6C63FF]" />
          </CardHeader>
        </Card>

        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-md">
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                QUALIFICATION STATE
              </span>
              <CardTitle className="text-sm font-heading font-extrabold uppercase text-[#00E599] mt-1">
                {lead.qualification_status}
              </CardTitle>
            </div>
            <ShieldCheck className="size-4 text-[#00E599]" />
          </CardHeader>
        </Card>
      </section>

      <LeadQualificationSummaryCard summary={qualificationSummary} />

      {/* State Form and Source Panel Grid */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] mb-6">
        {/* Left Side: Update State Form */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="text-sm">State & Assignment Governance</CardTitle>
            <CardDescription className="text-xs">
              Modifying lead values here generates immutable events in the audit trail ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form action={updateAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-mono font-bold text-white/50 uppercase">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={lead.status}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3 text-xs text-white focus:outline-none focus:border-[#00E599] transition-colors"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-xs font-mono font-bold text-white/50 uppercase">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue={lead.priority}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3 text-xs text-white focus:outline-none focus:border-[#00E599] transition-colors"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pipeline_stage_id" className="text-xs font-mono font-bold text-white/50 uppercase">Pipeline Stage</Label>
                <select
                  id="pipeline_stage_id"
                  name="pipeline_stage_id"
                  defaultValue={lead.pipeline_stage_id ?? ""}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3 text-xs text-white focus:outline-none focus:border-[#00E599] transition-colors"
                >
                  <option value="">Unstaged</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assigned_owner_user_id" className="text-xs font-mono font-bold text-white/50 uppercase">Assigned Owner</Label>
                <select
                  id="assigned_owner_user_id"
                  name="assigned_owner_user_id"
                  defaultValue={lead.assigned_owner_user_id ?? ""}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3 text-xs text-white focus:outline-none focus:border-[#00E599] transition-colors"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.user_id}>
                      {member.profile?.full_name || member.profile?.email || member.user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qualification_status" className="text-xs font-mono font-bold text-white/50 uppercase">Qualification</Label>
                <select
                  id="qualification_status"
                  name="qualification_status"
                  defaultValue={lead.qualification_status}
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3 text-xs text-white focus:outline-none focus:border-[#00E599] transition-colors"
                >
                  <option value="unqualified">Unqualified</option>
                  <option value="ai_review_pending">AI review pending</option>
                  <option value="ai_qualified">AI qualified</option>
                  <option value="human_qualified">Human qualified</option>
                  <option value="disqualified">Disqualified</option>
                  <option value="nurture">Nurture</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="first_contact_at" className="text-xs font-mono font-bold text-white/50 uppercase">First Contact At</Label>
                <Input
                  id="first_contact_at"
                  name="first_contact_at"
                  type="datetime-local"
                  className="rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-white focus:border-[#00E599] text-xs h-10 w-full"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="ai_qualification_decision_path" className="text-xs font-mono font-bold text-white/50 uppercase">
                  AI Qualification Decision Path Log
                </Label>
                <textarea
                  id="ai_qualification_decision_path"
                  name="ai_qualification_decision_path"
                  rows={4}
                  defaultValue={JSON.stringify(lead.ai_qualification_decision_path ?? [], null, 2)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#1A1A1A] p-4 text-xs font-mono text-white focus:outline-none focus:border-[#00E599] transition-colors resize-none"
                />
              </div>

              <Button type="submit" className="w-fit bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,229,153,0.1)]">
                Save state configurations
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Side: Identity Integrity panel */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="text-sm">Source & Identity Integrity</CardTitle>
            <CardDescription className="text-xs">
              Attribution and deduplication tags locked on ingestion.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-3 text-xs">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
              <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">Exact Source Ingress</p>
              <p className="font-heading font-extrabold text-white uppercase mt-1">{lead.exact_source}</p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
              <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">Campaign Subtype / Channel</p>
              <p className="font-heading font-extrabold text-white uppercase mt-1">{lead.source_subtype}{" // "}{lead.original_inbound_channel}</p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
              <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">Ingested / First Contact</p>
              <p className="font-mono text-white/80 mt-1">{formatDate(lead.captured_at)} / {formatDate(lead.first_contact_at)}</p>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
              <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">Strong Deduplication Key</p>
              <div className="flex items-center gap-1.5 mt-1 text-[#00E599] font-mono font-bold">
                <CheckCircle className="size-3.5" />
                <span>{lead.identity_confidence?.toUpperCase() || "RESOLVED"}{" // "}{lead.normalized_phone_e164 || lead.normalized_email || "NO STRONG ID"}</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
              <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">Source Integration Reference</p>
              <p className="font-mono text-white/70 mt-1 uppercase">{lead.source_reference || "None Logged"}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Row 4: Notes and Tasks */}
      <section className="grid gap-6 xl:grid-cols-2 mb-6">
        {/* Notes card */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="text-sm">Operator Internal Logs</CardTitle>
            <CardDescription className="text-xs">
              Contextual details shared internally by operators.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <form action={noteAction} className="space-y-3">
              <textarea
                name="body"
                rows={3}
                required
                className="w-full rounded-2xl border border-white/[0.08] bg-[#1A1A1A] p-4 text-xs leading-relaxed text-white focus:outline-none focus:border-[#00E599] transition-colors resize-none"
                placeholder="Log internal context notes..."
              />
              <Button type="submit" size="sm" className="bg-white/[0.03] border-white/[0.06] text-white hover:bg-white/[0.06] rounded-xl font-bold uppercase tracking-wider text-[10px] px-4 py-2 border">
                Record internal log
              </Button>
            </form>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
                  <p className="text-xs font-sans text-white/80 leading-relaxed font-medium">&ldquo;{note.body}&rdquo;</p>
                  <p className="mt-2 text-[9px] font-mono font-bold text-white/20 uppercase tracking-widest">{formatDate(note.created_at)}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-center py-4 text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest">No internal notes logged.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead tasks card */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="text-sm"> CRM Tasks Queue</CardTitle>
            <CardDescription className="text-xs">
              Follow-up tasks scoped to this organizational context.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <form action={taskAction} className="grid gap-3">
              <Input
                name="title"
                required
                placeholder="Required Action: Call lead back..."
                className="rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-white focus:border-[#00E599] text-xs h-10 w-full"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  name="due_at"
                  type="datetime-local"
                  className="rounded-xl border border-white/[0.08] bg-[#1A1A1A] text-white focus:border-[#00E599] text-xs h-10 w-full"
                />
                <select
                  name="assigned_to_user_id"
                  className="h-10 rounded-xl border border-white/[0.08] bg-[#1A1A1A] px-3 text-xs text-white focus:outline-none focus:border-[#00E599] transition-colors"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.user_id}>
                      {member.profile?.full_name || member.profile?.email || member.user_id}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm" className="w-fit bg-white/[0.03] border-white/[0.06] text-white hover:bg-white/[0.06] rounded-xl font-bold uppercase tracking-wider text-[10px] px-4 py-2 border">
                Schedule Task
              </Button>
            </form>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex justify-between items-start">
                  <div>
                    <p className="font-heading font-extrabold text-xs text-white uppercase tracking-wider">{task.title}</p>
                    <p className="mt-1 font-mono text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      Status: <span className="text-white/60">{task.status}</span> · Due: <span className="text-white/60">{task.due_at ? formatDate(task.due_at) : "No deadline"}</span>
                    </p>
                  </div>
                  <Badge variant={task.status === "completed" ? "active" : "neutral"}>
                    {task.status}
                  </Badge>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-center py-4 text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest">No scheduled tasks pending.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Origin Event Trail chronological timeline ledger */}
      <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl">
        <CardHeader className="border-b border-white/[0.04] pb-4">
          <CardTitle className="text-sm">Lead Origin Chronological Ledger</CardTitle>
          <CardDescription className="text-xs">
            Immutable history trails for attribution, assignment, qualification, and routing.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 relative">
          {/* Vertical timeline connector track */}
          <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-white/[0.05]" />

          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id} className="relative pl-12 flex flex-col md:flex-row md:items-start md:justify-between gap-2 select-none group">
                {/* Timeline Bullet */}
                <div className="absolute left-[20px] top-1.5 size-3 rounded-full border border-white/[0.08] bg-[#070707] flex items-center justify-center transition-all duration-300 group-hover:border-[#00E599]">
                  <div className="size-1 rounded-full bg-white/40 transition-all duration-300 group-hover:bg-[#00E599]" />
                </div>

                <div>
                  <h4 className="font-heading font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    {event.event_type}
                    {event.field_name && (
                      <span className="font-mono text-[9px] font-bold text-white/30 uppercase tracking-widest">
                        {"//"} {event.field_name}
                      </span>
                    )}
                  </h4>
                  {event.metadata && (
                    <div className="mt-1.5 max-w-xl text-[10px] text-white/60 leading-relaxed font-semibold uppercase tracking-wider space-y-1">
                      {Object.entries(event.metadata).map(([key, val]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-white/30">{key}:</span>
                          <span className="text-white/80">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="font-mono text-[9px] font-bold text-white/20 uppercase tracking-widest shrink-0 mt-1 md:mt-0">
                  {formatDate(event.created_at)}
                </span>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-center py-6 text-xs text-white/30 font-mono font-bold uppercase tracking-widest pl-12">
                No ledger nodes registered.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
