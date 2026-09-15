"use client";

import { useWaitlist } from "@clerk/nextjs";
import { useId, useState, type FormEvent } from "react";
import { isClerkConfigured } from "@/lib/clerk";

const btnClass =
  "inline-block cursor-pointer rounded-full border-0 bg-linear-to-br from-peach to-btn-end px-[1.35rem] py-[0.9rem] font-extrabold text-btn-ink no-underline shadow-[0_8px_20px_rgba(255,143,102,0.35)] disabled:cursor-wait disabled:opacity-70";

const inputClass =
  "w-full rounded-full border border-line bg-white px-4 py-[0.85rem] text-[1rem] text-ink outline-none placeholder:text-muted focus:border-peach";

export function WaitlistSuccess() {
  return (
    <div role="status" className="rounded-[20px] border border-line bg-white px-4 py-4">
      <p className="text-[1.1rem] font-extrabold">You’re on the list</p>
      <p className="mt-1 text-[0.95rem] text-muted">
        We’ll email you when it’s your turn. You can close this tab.
      </p>
    </div>
  );
}

function looksAlreadyJoined(code: string, message: string) {
  const blob = `${code} ${message}`.toLowerCase();
  return blob.includes("already") || blob.includes("exist");
}

function ClerkWaitlistForm() {
  const emailId = useId();
  const { waitlist, errors, fetchStatus } = useWaitlist();
  const [joined, setJoined] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const formData = new FormData(event.currentTarget);
    const emailAddress = String(formData.get("emailAddress") ?? "").trim();
    const { error } = await waitlist.join({ emailAddress });
    if (error) {
      if (looksAlreadyJoined(error.code, `${error.message} ${error.longMessage ?? ""}`)) {
        setJoined(true);
        return;
      }
      setSubmitError(
        error.longMessage || error.message || "Couldn’t join the list. Check the email and try again.",
      );
      return;
    }
    setJoined(true);
  }

  const fieldError = errors.fields.emailAddress?.longMessage || errors.fields.emailAddress?.message;
  const globalError = errors.global?.[0]?.longMessage || errors.global?.[0]?.message;
  const shownError = submitError || fieldError || globalError || null;

  if (joined || waitlist.id) {
    return <WaitlistSuccess />;
  }

  return (
    <form className="flex max-w-[22rem] flex-col gap-3" onSubmit={onSubmit}>
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
        disabled={fetchStatus === "fetching"}
      />
      {shownError ? (
        <p className="text-[0.9rem] text-[#b42318]" role="alert">
          {shownError}
        </p>
      ) : null}
      <button className={btnClass} type="submit" disabled={fetchStatus === "fetching"}>
        {fetchStatus === "fetching" ? "Saving your spot…" : "Get early access"}
      </button>
    </form>
  );
}

function SetupForm() {
  const emailId = useId();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex max-w-[22rem] flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(
          "Signup isn’t connected yet. Add the two Clerk keys (see the README), then restart the app.",
        );
      }}
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
      />
      {error ? (
        <p className="text-[0.9rem] text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      <button className={btnClass} type="submit">
        Get early access
      </button>
    </form>
  );
}

export function EarlyAccessForm() {
  if (isClerkConfigured()) {
    return <ClerkWaitlistForm />;
  }
  return <SetupForm />;
}
