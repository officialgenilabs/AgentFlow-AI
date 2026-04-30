import Link from "next/link";
import { ArrowRight, Circle, MessageSquareText, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInbox, displayConversationOwner } from "@/lib/data/inbox";

function statusTone(status: string) {
  if (status === "handoff") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "closed") return "bg-slate-100 text-slate-500 border-slate-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default async function InboxPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ conversationId?: string; error?: string }> }) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams]);
  const { tenant, conversations, selectedConversation, messages, members } = await getInbox(orgSlug, query.conversationId);
  const selectedLead = selectedConversation?.lead ?? null;

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-accent)]">Stage C system inbox</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Conversations</h2>
          <p className="mt-2 text-sm text-slate-600">CRM-backed inbound threads. Every message is attached through identity + intake first.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {conversations.length} conversation{conversations.length === 1 ? "" : "s"} · inbound only
        </div>
      </div>

      {query.error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{query.error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Conversation list</CardTitle>
            <CardDescription>Open, handoff, and closed threads scoped to this organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                <MessageSquareText className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 font-medium text-slate-800">No conversations yet.</p>
                <p className="mt-2 text-sm text-slate-500">Stage C ingestion will create threads from verified channels.</p>
              </div>
            ) : conversations.map((conversation) => {
              const isActive = selectedConversation?.id === conversation.id;
              return (
                <Link key={conversation.id} href={`/app/${orgSlug}/inbox?conversationId=${conversation.id}`} className={`block rounded-3xl border p-4 transition ${isActive ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`truncate text-sm font-semibold ${isActive ? "text-white" : "text-slate-950"}`}>{conversation.lead?.full_name ?? conversation.subject ?? "Unknown lead"}</p>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${isActive ? "border-white/20 bg-white/10 text-white" : statusTone(conversation.status)}`}>{conversation.status}</span>
                  </div>
                  <p className={`mt-2 truncate text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>{conversation.channel?.display_name ?? "Channel"} · {conversation.external_conversation_id ?? "internal-thread"}</p>
                  <p className={`mt-3 text-xs ${isActive ? "text-slate-300" : "text-slate-500"}`}>Owner: {displayConversationOwner(members, conversation)}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-h-[640px]">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{selectedConversation ? selectedLead?.full_name ?? selectedConversation.subject ?? "Conversation" : "No thread selected"}</CardTitle>
                <CardDescription>{selectedConversation?.channel?.provider ?? "CRM"} / {selectedConversation?.channel?.channel_type ?? "inbox"} · outbound and AI replies disabled</CardDescription>
              </div>
              {selectedConversation ? <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase ${statusTone(selectedConversation.status)}`}>{selectedConversation.status}</span> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {!selectedConversation ? (
              <div className="flex min-h-[460px] items-center justify-center rounded-3xl border border-dashed border-slate-300 text-center">
                <div>
                  <MessageSquareText className="mx-auto size-10 text-slate-300" />
                  <p className="mt-3 font-medium text-slate-800">Waiting for controlled ingestion.</p>
                  <p className="mt-2 text-sm text-slate-500">Messages cannot be manually inserted into this inbox.</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No messages found for this thread.</div>
            ) : messages.map((message) => (
              <div key={message.id} className="max-w-[82%] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <Circle className="size-2 fill-emerald-500 text-emerald-500" /> {message.sender_display_name ?? "Inbound lead"} · {message.direction}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{message.body}</p>
                <p className="mt-3 text-xs text-slate-400">{new Date(message.occurred_at).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead context</CardTitle>
            <CardDescription>Read-only CRM panel. Source of truth stays in Leads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedLead ? (
              <>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white"><UserRound className="size-5" /></div>
                    <div>
                      <p className="font-semibold text-slate-950">{selectedLead.full_name}</p>
                      <p className="text-xs text-slate-500">{selectedLead.email || selectedLead.phone || "No contact detail"}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 p-3"><p className="text-xs text-slate-400">Lead status</p><p className="font-medium text-slate-800">{selectedLead.status}</p></div>
                  <div className="rounded-2xl border border-slate-200 p-3"><p className="text-xs text-slate-400">Identity confidence</p><p className="font-medium text-slate-800">{selectedLead.identity_confidence}</p></div>
                  <div className="rounded-2xl border border-slate-200 p-3"><p className="text-xs text-slate-400">Assignment</p><p className="font-medium text-slate-800">{displayConversationOwner(members, selectedConversation)}</p></div>
                </div>
                <Link href={`/app/${orgSlug}/leads/${selectedLead.id}`} className="flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Open CRM lead <ArrowRight className="size-4" />
                </Link>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No lead attached. This should only happen when identity is truly unknown.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
