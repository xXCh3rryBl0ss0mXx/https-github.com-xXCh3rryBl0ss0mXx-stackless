"use client";

import { useId, useState, type FormEvent } from "react";
import { joinWaitlistAction } from "@/app/waitlist/actions";

const btnClass =
  "inline-block cursor-pointer rounded-full border-0 bg-linear-to-br from-peach to-btn-end px-[1.35rem] py-[0.9rem] font-extrabold text-btn-ink no-underline shadow-[0_8px_20px_rgba(255,143,102,0.35)] disabled:cursor-wait disabled:opacity-70";

const inputClass =
  "w-full rounded-full border border-line bg-white px-4 py-[0.85rem] text-[1rem] text-ink outline-none placeholder:text-muted focus:border-peach";

export function WaitlistSuccess({ already = false }: { already?: boolean }) {
  return (
    <div role="status" className="rounded-[20px] border border-line bg-white px-4 py-4">
      <p className="text-[1.1rem] font-extrabold">
        {already ? "You’re already on the list" : "You’re on the list"}
      </p>
      <p className="mt-1 text-[0.95rem] text-muted">
        We’ll email you when it’s your turn. You can close this tab.
      </p>
    </div>
  );
}

export function EarlyAccessForm() {
  const emailId = useId();
  const [status, setStatus] = useState<"form" | "created" | "already">("form");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setPending(true);
    try {
      const result = await joinWaitlistAction(new FormData(event.currentTarget));
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      setStatus(result.created ? "created" : "already");
    } catch {
      setSubmitError("Couldn’t save that email. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (status === "created") return <WaitlistSuccess />;
  if (status === "already") return <WaitlistSuccess already />;

  return (
    <form
      className="mx-auto flex w-full max-w-[22rem] flex-col items-center gap-3"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor={emailId}>
        Email
      </label>
      <input
        id={emailId}
        name="emailAddress"
        type="email"
        autoComplete="email"
        required
        placeholder="you@studio.com"
        className={inputClass}
        disabled={pending}
      />
      {submitError ? (
        <p className="w-full text-center text-[0.9rem] text-[#b42318]" role="alert">
          {submitError}
        </p>
      ) : null}
      <button className={btnClass} type="submit" disabled={pending}>
        {pending ? "Saving your spot…" : "Get early access"}
      </button>
    </form>
  );
}
