"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, MessageSquare, Network, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ApprovalQueueItem } from "@/lib/data/approvals";
import { reviewAiMessageDraft } from "@/features/approvals/actions";

type ApprovalQueueClientProps = {
  orgSlug: string;
  items: ApprovalQueueItem[];
};

export function ApprovalQueueClient({ orgSlug, items }: ApprovalQueueClientProps) {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? "");
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );
  const [editing, setEditing] = useState<boolean>(false);

  if (!selectedItem) return null;

  const reviewAction = reviewAiMessageDraft.bind(null, orgSlug, selectedItem.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-white/40 mb-2 px-1">
          Approval Queue ({items.length})
        </h2>
        {items.map((item) => {
          const isSelected = item.id === selectedItem.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedId(item.id);
                setEditing(false);
              }}
              className={cn(
                "w-full text-left rounded-2xl border p-4 transition-all duration-200 backdrop-blur-md flex flex-col gap-2 select-none",
                isSelected
                  ? "bg-[#00E599]/5 border-[#00E599]/30 shadow-[0_0_20px_rgba(0,229,153,0.04)]"
                  : "bg-[#111111]/40 border-white/[0.04] hover:bg-[#111111]/60 hover:border-white/[0.08]",
              )}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                  {item.leadName}
                </span>
                <span className={cn(
                  "font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  item.confidenceScore >= 90
                    ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20",
                )}>
                  {item.confidenceScore}% Acc
                </span>
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                {item.propertyReference}
              </p>
              <p className="text-xs text-white/60 line-clamp-2 mt-1 italic">
                &quot;{item.inboundMessage}&quot;
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.03] text-[9px] uppercase tracking-widest text-white/30 font-bold">
                <span>Ingress: {item.channel}</span>
                <span>Review required</span>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl flex flex-col justify-between h-full">
        <CardHeader className="border-b border-white/[0.04] pb-5">
          <div className="flex justify-between items-center gap-4">
            <div>
              <CardTitle className="text-lg">{selectedItem.leadName}</CardTitle>
              <CardDescription className="text-xs mt-1">
                Active operational context // {selectedItem.propertyReference}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/30 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#A29EFF] font-mono">
                HUMAN APPROVAL REQUIRED
              </span>
            </div>
          </div>
        </CardHeader>

        <form action={reviewAction} className="flex min-h-0 flex-1 flex-col">
          <CardContent className="space-y-5 pt-6 flex-1">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                <MessageSquare className="size-3 text-[#00E599]" /> Inbound Inquiry
              </span>
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-xs text-white/80 leading-relaxed font-medium italic">
                &quot;{selectedItem.inboundMessage}&quot;
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                <BookOpen className="size-3 text-[#6C63FF]" /> Resolved Lead Memory Context
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedItem.memoryContext.map((context, index) => (
                  <div key={`${selectedItem.id}-${index}`} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-[11px] leading-relaxed text-white/60 font-semibold flex items-start gap-2">
                    <span className="size-1.5 bg-[#6C63FF] rounded-full mt-1.5 shrink-0" />
                    <span>{context}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                <Network className="size-3 text-white/30" /> Ingress Routing Rationale
              </span>
              <p className="text-[11px] text-white/50 leading-relaxed font-bold">
                {selectedItem.routingRationale}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-[#00E599]" /> Operator Outbound Draft
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">
                  {editing ? "Draft Modified" : "Canonical Draft"}
                </span>
              </div>
              <textarea
                name="draft_content"
                key={selectedItem.id}
                defaultValue={selectedItem.draftResponse}
                onChange={() => {
                  setEditing(true);
                }}
                rows={5}
                className="w-full rounded-2xl border border-white/[0.08] bg-[#1A1A1A]/80 p-4 text-xs leading-relaxed text-white focus:outline-none focus:border-[#00E599] transition-colors resize-none font-medium font-sans"
              />
            </div>
          </CardContent>

          <div className="border-t border-white/[0.04] p-6 bg-white/[0.01] flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-white/30 uppercase">
                Score:
              </span>
              <span className={cn(
                "font-mono text-xs font-extrabold px-3 py-1 rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.4)]",
                selectedItem.confidenceScore >= 90
                  ? "bg-[#00E599]/15 text-[#00E599] border-[#00E599]/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30",
              )}>
                {selectedItem.confidenceScore}% ACCURACY INTENT
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                name="status"
                value="discarded"
                variant="outline"
                className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl"
              >
                <X className="size-4 mr-2" /> Discard Draft
              </Button>
              <Button
                type="submit"
                name="status"
                value="draft"
                variant="secondary"
                className="rounded-xl"
              >
                Save Edit
              </Button>
              <Button
                type="submit"
                name="status"
                value="approved"
                className="bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl shadow-[0_0_20px_rgba(0,229,153,0.3)]"
              >
                <Send className="size-4 mr-2" /> Approve Draft
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
