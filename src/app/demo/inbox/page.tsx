import Link from "next/link";
import { ArrowRight, Circle, MessageSquare, UserRound, ShieldAlert, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInbox, displayConversationOwner } from "@/lib/data/inbox";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";

function statusTone(status: string) {
  if (status === "handoff") return "warning";
  if (status === "closed") return "neutral";
  return "active";
}

export default async function DemoInboxPage({ searchParams }: { searchParams: Promise<{ conversationId?: string; error?: string }> }) {
  const query = await searchParams;
  const orgSlug = "boutique-properties";
  const { tenant, conversations, selectedConversation, messages, members } = await getInbox(orgSlug, query.conversationId, true);
  const selectedLead = selectedConversation?.lead ?? null;

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#00E599] uppercase">
            COMMUNICATION INGRESS
          </span>
          <h2 className="text-3xl font-heading font-extrabold text-white mt-1">Live Inbound Queue</h2>
          <p className="mt-2 text-xs text-white/50 leading-relaxed uppercase tracking-wider">
            CRM-backed inbound threads. Every message is attached through identity + intake layers first.
          </p>
        </div>
        <Badge variant="mint">
          {conversations.length} Active Thread{conversations.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {query.error ? (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-400 font-mono">
          SYSTEM ERROR: {query.error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        {/* Left Side: Conversation list */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl flex flex-col h-[75vh]">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="text-sm">Inbound Conversations</CardTitle>
            <CardDescription className="text-xs">
              Open, handoff, and closed threads.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 overflow-y-auto flex-1 space-y-2 pr-1">
            {conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center flex flex-col items-center justify-center h-full">
                <MessageSquare className="size-8 text-white/20 animate-pulse" />
                <p className="mt-3 text-xs font-bold text-white/60 uppercase tracking-wider">No conversations yet</p>
                <p className="mt-2 text-[10px] text-white/40 leading-relaxed">
                  Ingress routing will automatically ingest dynamic messaging streams.
                </p>
              </div>
            ) : conversations.map((conversation) => {
              const isActive = selectedConversation?.id === conversation.id;
              const statusVariant = statusTone(conversation.status);
              return (
                <Link 
                  key={conversation.id} 
                  href={`/demo/inbox?conversationId=${conversation.id}`} 
                  className={`block rounded-2xl border p-4 transition-all duration-200 select-none ${
                    isActive 
                      ? "bg-[#00E599]/5 border-[#00E599]/30 shadow-[0_0_15px_rgba(0,229,153,0.03)]" 
                      : "border-white/[0.04] bg-[#111111]/30 hover:bg-[#111111]/50 hover:border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className={`truncate text-xs font-heading font-extrabold uppercase tracking-wider ${isActive ? "text-white" : "text-white/80"}`}>
                      {conversation.lead?.full_name ?? conversation.subject ?? "Unknown lead"}
                    </p>
                    <Badge variant={statusVariant}>
                      {conversation.status}
                    </Badge>
                  </div>
                  <p className="mt-2 truncate font-mono text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">
                    {conversation.channel?.display_name ?? "Channel"} // {conversation.external_conversation_id ?? "internal"}
                  </p>
                  <p className="mt-3 text-[9px] font-mono text-white/30 uppercase tracking-wider">
                    Owner: <span className="text-white/50">{displayConversationOwner(members, conversation)}</span>
                  </p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Center: Message list */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl flex flex-col h-[75vh]">
          <CardHeader className="border-b border-white/[0.04] pb-4 shrink-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-sm">
                  {selectedConversation 
                    ? selectedLead?.full_name ?? selectedConversation.subject ?? "Active Ingress Thread" 
                    : "Select a conversation"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedConversation?.channel?.provider ?? "Ingress"} // {selectedConversation?.channel?.channel_type ?? "whatsapp"}
                </CardDescription>
              </div>
              {selectedConversation && (
                <Badge variant={statusTone(selectedConversation.status)}>
                  {selectedConversation.status}
                </Badge>
              )}
            </div>
            {/* Outbound Dispatch Governance Guard notice */}
            {selectedConversation && (
              <div className="mt-3 rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/5 px-3 py-2 text-[10px] text-[#A29EFF] font-mono font-bold flex items-center gap-2">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span>OUTBOUND GOVERNANCE GATED: USE THE DEDICATED APPROVALS SCREEN TO DISPATCH OUTBOUND DRAFTS.</span>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-[#070707]/30">
            {!selectedConversation ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/[0.06] text-center p-8">
                <div className="max-w-xs flex flex-col items-center">
                  <MessageSquare className="size-10 text-white/20 mb-3 animate-pulse" />
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Waiting for ingress</p>
                  <p className="mt-2 text-[10px] text-white/40 leading-relaxed uppercase">
                    Select a conversation thread from the queue list to inspect live communications.
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-white/40 uppercase tracking-wider font-mono">
                No message objects resolved in this thread container.
              </div>
            ) : (
              messages.map((message) => {
                const isOutbound = message.direction === "outbound";
                const isSystem = message.direction === "system";
                
                return (
                  <div 
                    key={message.id} 
                    className={`max-w-[85%] rounded-2xl p-4 transition-all duration-200 border ${
                      isSystem 
                        ? "bg-[#6C63FF]/5 border-[#6C63FF]/15 text-[#A29EFF] font-mono mr-auto w-full max-w-full" 
                        : isOutbound
                          ? "bg-[#00E599]/5 border-[#00E599]/20 text-white ml-auto"
                          : "bg-[#161616] border-white/[0.04] text-white mr-auto"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase leading-none">
                      <span className="flex items-center gap-1.5">
                        <Circle className={`size-1.5 ${isSystem ? "fill-[#6C63FF] text-[#6C63FF]" : isOutbound ? "fill-[#00E599] text-[#00E599]" : "fill-white/40 text-white/40"}`} />
                        {message.sender_display_name ?? "Ingress Lead"}
                      </span>
                      <span>{message.direction}</span>
                    </div>
                    <p className={`whitespace-pre-wrap text-xs leading-relaxed ${isSystem ? "font-mono font-semibold" : "font-sans font-medium"}`}>
                      {message.body}
                    </p>
                    <p className="mt-3 text-[8px] font-mono font-bold text-white/20 uppercase tracking-widest text-right leading-none">
                      {new Date(message.occurred_at).toLocaleTimeString()}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Side: Lead context */}
        <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl flex flex-col h-[75vh]">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="text-sm">Resolved Ingress Identity</CardTitle>
            <CardDescription className="text-xs">
              Contextual CRM profiles.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between p-4 min-h-0">
            {selectedLead ? (
              <>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 flex flex-col items-center text-center">
                    <div className="size-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
                      <UserRound className="size-5 text-[#00E599]" />
                    </div>
                    <p className="font-heading font-extrabold text-sm text-white">{selectedLead.full_name}</p>
                    <p className="text-[10px] font-mono text-white/40 mt-1 uppercase tracking-wider break-all">
                      {selectedLead.email || selectedLead.phone || "No details"}
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
                      <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                        Lead status
                      </p>
                      <p className="text-xs font-bold text-white uppercase mt-1">
                        {selectedLead.status}
                      </p>
                    </div>
                    
                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
                      <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                        Identity Confidence
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-[#00E599] font-mono">
                        <CheckCircle className="size-3.5 shrink-0 text-[#00E599]" />
                        <span>{selectedLead.identity_confidence?.toUpperCase() || "RESOLVED"}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
                      <p className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase">
                        Assigned Operator
                      </p>
                      <p className="text-xs font-bold text-white mt-1">
                        {displayConversationOwner(members, selectedConversation)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button asChild className="w-full bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl font-bold text-xs uppercase tracking-wider py-5 shadow-[0_0_15px_rgba(0,229,153,0.1)]">
                    <Link href={`/demo/leads/${selectedLead.id}`}>
                      Open CRM lead <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-white/40 uppercase tracking-wider font-mono my-auto">
                No identity resolved for this thread container.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
