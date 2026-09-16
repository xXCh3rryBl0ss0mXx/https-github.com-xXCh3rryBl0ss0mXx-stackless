"use client";

import { useActionState, useState } from "react";
import { saveDraftAction, sendNudgeAction, skipAction } from "@/app/app/actions";
import { CopyButton } from "@/components/copy-button";
import { MAX_NUDGE_SEND_ATTEMPTS } from "@/lib/data/due-nudges";
import type { NudgeKind } from "@/lib/data/types";
import {
  datetimeLocalToIso,
  formatScheduledFor,
  isoDaysFromNow,
  isoToDatetimeLocal,
  isScheduledDue,
} from "@/lib/schedule";

const primaryBtn =
  "cursor-pointer rounded-full border-0 bg-linear-to-br from-peach to-btn-end px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-btn-ink shadow-[0_8px_20px_rgba(255,143,102,0.35)] disabled:cursor-not-allowed disabled:opacity-60";

const quietBtn =
  "cursor-pointer rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[0.9rem] font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-60";

const mintBtn =
  "cursor-pointer rounded-full border-0 bg-mint px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-[#145c3d] disabled:cursor-not-allowed disabled:opacity-60";

const textareaClass =
  "mt-2 w-full resize-y rounded-[16px] border border-line bg-white p-3 font-[inherit] text-[0.95rem] text-bubble outline-none focus:border-peach";

const fieldClass =
  "w-full rounded-[16px] border border-line bg-white px-3 py-2 font-[inherit] text-[0.95rem] text-bubble outline-none focus:border-peach";

const chip =
  "cursor-pointer rounded-full border border-line bg-white px-3 py-[0.35rem] font-[inherit] text-[0.78rem] font-extrabold text-muted disabled:cursor-not-allowed disabled:opacity-60";

const chipOn =
  "cursor-pointer rounded-full border-0 bg-mint px-3 py-[0.35rem] font-[inherit] text-[0.78rem] font-extrabold text-[#145c3d] disabled:cursor-not-allowed disabled:opacity-60";

const SHORTCUTS = [
  { label: "In 1 day", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
] as const;

export function NudgeActions({
  kind,
  relatedId,
  nudgeId,
  initialText,
  toEmail,
  initialScheduledFor,
  lastError,
  sendAttempts,
}: {
  kind: NudgeKind;
  relatedId: string;
  nudgeId?: string;
  initialText: string;
  toEmail?: string;
  initialScheduledFor?: string;
  lastError?: string;
  sendAttempts?: number;
}) {
  const [text, setText] = useState(initialText);
  const [scheduledFor, setScheduledFor] = useState(initialScheduledFor ?? "");
  const [pickedDays, setPickedDays] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sendState, sendAction, sending] = useActionState(sendNudgeAction, null);
  const tagClass =
    kind === "invoice" ? "bg-invoice-bg text-invoice-fg" : "bg-follow-bg text-follow-fg";
  const sendLabel = sending ? "Sending…" : confirming ? "Yes, send it" : "Send email";
  const confirmLine = toEmail
    ? `Send this to ${toEmail}?`
    : "Send this email now?";
  const scheduleDue = Boolean(scheduledFor) && isScheduledDue(scheduledFor, new Date());
  const stoppedRetrying = (sendAttempts ?? 0) >= MAX_NUDGE_SEND_ATTEMPTS;

  function pickRelative(days: number) {
    setScheduledFor(isoDaysFromNow(days));
    setPickedDays(days);
  }

  function pickDatetime(value: string) {
    setScheduledFor(value ? datetimeLocalToIso(value) : "");
    setPickedDays(null);
  }

  function clearSchedule() {
    setScheduledFor("");
    setPickedDays(null);
  }

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span
          className={`inline-block rounded-full px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold ${tagClass}`}
        >
          {nudgeId ? (scheduledFor ? "Scheduled draft" : "Draft") : "Write a draft"}
        </span>
        <CopyButton text={text} />
      </div>
      <form className="flex flex-col gap-3">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="relatedId" value={relatedId} />
        {nudgeId ? <input type="hidden" name="nudgeId" value={nudgeId} /> : null}
        <input type="hidden" name="scheduledFor" value={scheduledFor} />
        <textarea
          name="draftText"
          className={textareaClass}
          rows={4}
          value={text}
          disabled={sending}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="rounded-[16px] border border-line bg-phone-wash p-3">
          <p className="mb-1 text-[0.82rem] font-bold text-muted">Send later</p>
          <p className="mb-2 text-[0.85rem] text-muted">
            Pick a time and save the draft. If you’re offline, we’ll still send it when it’s due.
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.days}
                className={pickedDays === shortcut.days ? chipOn : chip}
                type="button"
                disabled={sending}
                onClick={() => pickRelative(shortcut.days)}
              >
                {shortcut.label}
              </button>
            ))}
            {scheduledFor ? (
              <button className={chip} type="button" disabled={sending} onClick={clearSchedule}>
                Not scheduled
              </button>
            ) : null}
          </div>
          <label className="block">
            <span className="mb-1 block text-[0.82rem] font-bold text-muted">Date and time</span>
            <input
              className={fieldClass}
              type="datetime-local"
              disabled={sending}
              value={scheduledFor ? isoToDatetimeLocal(scheduledFor) : ""}
              onChange={(event) => pickDatetime(event.target.value)}
            />
          </label>
          {scheduledFor ? (
            <p className="mt-2 text-[0.88rem] font-semibold text-follow-fg">
              {scheduleDue
                ? `Due now — we’ll send it on the next daily check, or tap Send email.`
                : `We’ll send this ${formatScheduledFor(scheduledFor)} if you’re offline.`}
            </p>
          ) : (
            <p className="mt-2 text-[0.85rem] text-muted">No auto-send until you pick a time.</p>
          )}
        </div>
        {confirming ? (
          <p className="text-[0.92rem] font-semibold text-muted">{confirmLine}</p>
        ) : null}
        {lastError ? (
          <p
            role="alert"
            className="rounded-[16px] border border-peach bg-badge-bg px-3 py-2 text-[0.9rem] font-semibold text-badge-fg"
          >
            Last scheduled send didn’t go through: {lastError}
            {stoppedRetrying
              ? " We stopped auto-retrying. Save the draft or send it yourself."
              : " We’ll try again on the next daily check."}
          </p>
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
