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
  sendAction: DraftAction;
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
  if (sentMessage.status === "sent") return `Sent${sentMessage.external_message_id ? ` · ${sentMessage.external_message_id}` : ""}`;
  if (sentMessage.status === "failed") return "Send failed · manual retry required";
  if (sentMessage.status === "pending") return "Send pending";
  return sentMessage.status;
}

export function DraftSuggestionCard({ draft, sentMessage, updateAction, sendAction }: DraftSuggestionCardProps) {
  const isEditable = draft.status === "draft";
  const isSent = sentMessage?.status === "sent";
  const isFailed = sentMessage?.status === "failed";
  const isPending = sentMessage?.status === "pending";
  const statusCopy = sendStatusCopy(sentMessage);

  return (
    <div className="ml-auto max-w-[88%] rounded-3xl border border-violet-200 bg-violet-50/70 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
          <Sparkles className="size-4" /> AI suggestion · {draft.status}
        </div>
        <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-violet-700">
          Human-controlled send
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

        {statusCopy ? (
          <p className={`rounded-2xl px-3 py-2 text-xs font-semibold ${isFailed ? "border border-red-200 bg-red-50 text-red-700" : "border border-violet-200 bg-white text-violet-700"}`}>
            {statusCopy}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isEditable ? (
            <>
              <SubmitButton type="submit" name="status" value="draft" size="sm" variant="secondary" pendingLabel="Saving...">Save edit</SubmitButton>
              <SubmitButton type="submit" name="status" value="approved" size="sm" pendingLabel="Approving...">Approve draft</SubmitButton>
              <SubmitButton type="submit" name="status" value="discarded" size="sm" variant="ghost" pendingLabel="Discarding...">Discard</SubmitButton>
              <SubmitButton formAction={sendAction} type="submit" name="status" value="approved" size="sm" className="bg-emerald-600 hover:bg-emerald-700" pendingLabel="Sending...">
                Approve &amp; Send
              </SubmitButton>
            </>
          ) : isFailed ? (
            <SubmitButton formAction={sendAction} type="submit" name="status" value="approved" size="sm" className="bg-emerald-600 hover:bg-emerald-700" pendingLabel="Retrying...">
              Retry send manually
            </SubmitButton>
          ) : isPending ? (
            <p className="text-xs text-violet-700">Send is in progress. No background retry is scheduled.</p>
          ) : isSent ? (
            <p className="text-xs text-violet-700">Outbound logged and locked. Duplicate sends are blocked.</p>
          ) : draft.status === "approved" ? (
            <SubmitButton formAction={sendAction} type="submit" name="status" value="approved" size="sm" className="bg-emerald-600 hover:bg-emerald-700" pendingLabel="Sending...">
              Send approved draft
            </SubmitButton>
          ) : (
            <p className="text-xs text-violet-700">Draft is {draft.status}. It cannot be sent.</p>
          )}
        </div>
      </form>
    </div>
  );
}
