"use client";

import { useActionState, useState } from "react";
import { saveDraftAction, sendNudgeAction, skipAction } from "@/app/app/actions";
import { CopyButton } from "@/components/copy-button";
import type { NudgeKind } from "@/lib/data/types";

const primaryBtn =
  "cursor-pointer rounded-full border-0 bg-linear-to-br from-peach to-btn-end px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-btn-ink shadow-[0_8px_20px_rgba(255,143,102,0.35)] disabled:cursor-not-allowed disabled:opacity-60";

const quietBtn =
  "cursor-pointer rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[0.9rem] font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-60";

const mintBtn =
  "cursor-pointer rounded-full border-0 bg-mint px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-[#145c3d] disabled:cursor-not-allowed disabled:opacity-60";

const textareaClass =
  "mt-2 w-full resize-y rounded-[16px] border border-line bg-white p-3 font-[inherit] text-[0.95rem] text-bubble outline-none focus:border-peach";

export function NudgeActions({
  kind,
  relatedId,
  nudgeId,
  initialText,
  toEmail,
}: {
  kind: NudgeKind;
  relatedId: string;
  nudgeId?: string;
  initialText: string;
  toEmail?: string;
}) {
  const [text, setText] = useState(initialText);
  const [confirming, setConfirming] = useState(false);
  const [sendState, sendAction, sending] = useActionState(sendNudgeAction, null);
  const tagClass =
    kind === "invoice" ? "bg-invoice-bg text-invoice-fg" : "bg-follow-bg text-follow-fg";
  const sendLabel = sending ? "Sending…" : confirming ? "Yes, send it" : "Send email";
  const confirmLine = toEmail
    ? `Send this to ${toEmail}?`
    : "Send this email now?";

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={`inline-block rounded-full px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold ${tagClass}`}
        >
          {nudgeId ? "Draft" : "Write a draft"}
        </span>
        <CopyButton text={text} />
      </div>
      <form className="flex flex-col gap-3">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="relatedId" value={relatedId} />
        {nudgeId ? <input type="hidden" name="nudgeId" value={nudgeId} /> : null}
        <textarea
          name="draftText"
          className={textareaClass}
          rows={4}
          value={text}
          disabled={sending}
          onChange={(event) => setText(event.target.value)}
        />
        {confirming ? (
          <p className="text-[0.92rem] font-semibold text-muted">{confirmLine}</p>
        ) : null}
        {sendState && !sendState.ok ? (
          <p
            role="alert"
            className="rounded-[16px] border border-peach bg-badge-bg px-3 py-2 text-[0.9rem] font-semibold text-badge-fg"
          >
            {sendState.error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            className={primaryBtn}
            formAction={saveDraftAction}
            type="submit"
            disabled={sending}
          >
            Save draft
          </button>
          {confirming ? (
            <>
              <button className={mintBtn} formAction={sendAction} type="submit" disabled={sending}>
                {sendLabel}
              </button>
              <button
                className={quietBtn}
                type="button"
                disabled={sending}
                onClick={() => setConfirming(false)}
              >
                Never mind
              </button>
            </>
          ) : (
            <button
              className={mintBtn}
              type="button"
              disabled={sending}
              onClick={() => setConfirming(true)}
            >
              Send email
            </button>
          )}
          <button className={quietBtn} formAction={skipAction} type="submit" disabled={sending}>
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}
