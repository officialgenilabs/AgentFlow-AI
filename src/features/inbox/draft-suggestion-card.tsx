"use client";

import type React from "react";
import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiMessageDraft, Message } from "@/lib/types";

type DraftAction = (formData: FormData) => void | Promise<void>;

type DraftSuggestionCardProps = {
  draft: AiMessageDraft;
  sentMessage?: Pick<Message, "id" | "status" | "external_message_id" | "sent_at"> | null;
  updateAction: DraftAction;
};

function SubmitButton({ children, pendingLabel, ...props }: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? pendingLabel ?? "Working..." : children}
    </Button>
  );
}

function sendStatusCopy(sentMessage?: DraftSuggestionCardProps["sentMessage"]) {
  if (!sentMessage) return null;
  if (sentMessage.status === "sent") return `Historical outbound log${sentMessage.external_message_id ? ` · ${sentMessage.external_message_id}` : ""}`;
  if (sentMessage.status === "failed") return "Historical outbound attempt failed before governance lock";
  if (sentMessage.status === "pending") return "Historical outbound attempt pending review";
  return sentMessage.status;
}

export function DraftSuggestionCard({ draft, sentMessage, updateAction }: DraftSuggestionCardProps) {
  const isEditable = draft.status === "draft";
  const statusCopy = sendStatusCopy(sentMessage);

  return (
    <div className="ml-auto max-w-[88%] rounded-3xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
          <Sparkles className="size-4" /> AI suggestion · {draft.status}
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700">
          Outbound governance locked
        </span>
      </div>

      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="conversation_id" value={draft.conversation_id} />
        <textarea
          name="draft_content"
          rows={5}
          defaultValue={draft.draft_content}
          disabled={!isEditable}
          className="w-full rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-violet-400 disabled:bg-violet-50 disabled:text-slate-500"
        />

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Outbound sending is currently governance-locked during certification. Drafts remain visible for review, but no message can be sent from this interface.
        </div>

        {statusCopy ? (
          <p className="rounded-2xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700">
            {statusCopy}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isEditable ? (
            <>
              <SubmitButton type="submit" name="status" value="draft" size="sm" variant="secondary" pendingLabel="Saving...">Save edit</SubmitButton>
              <SubmitButton type="submit" name="status" value="approved" size="sm" pendingLabel="Approving...">Approve draft</SubmitButton>
              <SubmitButton type="submit" name="status" value="discarded" size="sm" variant="ghost" pendingLabel="Discarding...">Discard</SubmitButton>
            </>
          ) : (
            <p className="text-xs text-violet-700">Draft is {draft.status}. Outbound authority remains locked pending certification.</p>
          )}
          <Button type="button" size="sm" disabled className="cursor-not-allowed border border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100">
            Sending locked
          </Button>
        </div>
      </form>
    </div>
  );
}
