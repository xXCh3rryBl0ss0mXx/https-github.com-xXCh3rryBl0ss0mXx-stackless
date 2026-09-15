import { Resend } from "resend";
import type { NudgeKind } from "@/lib/data/types";
import { readResendConfig } from "./config";
import { nudgeEmailHtml, nudgeEmailText, nudgeSubject } from "./templates";

export type SendNudgeInput = {
  kind: NudgeKind;
  to: string;
  draftText: string;
  idempotencyKey?: string;
};

export type SendNudgeResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type EmailClient = {
  emails: {
    send: (
      payload: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text: string;
      },
      options?: { idempotencyKey?: string },
    ) => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
  };
};

export type SendNudgeDeps = {
  env?: NodeJS.Dict<string>;
  client?: EmailClient;
};

function missingToError(): SendNudgeResult {
  return { ok: false, error: "This person has no email address, so we can’t send." };
}

/** Server-only. Builds the follow-up / invoice template and calls Resend. */
export async function sendNudgeEmail(
  input: SendNudgeInput,
  deps: SendNudgeDeps = {},
): Promise<SendNudgeResult> {
  const config = readResendConfig(deps.env ?? process.env);
  if (!config.ok) return config;

  const to = input.to.trim();
  if (!to) return missingToError();

  const payload = {
    from: config.from,
    to,
    subject: nudgeSubject(input.kind),
    html: nudgeEmailHtml(input.kind, input.draftText),
    text: nudgeEmailText(input.draftText),
  };
  const options = input.idempotencyKey
    ? { idempotencyKey: input.idempotencyKey }
    : undefined;

  try {
    const { data, error } = deps.client
      ? await deps.client.emails.send(payload, options)
      : await new Resend(config.apiKey).emails.send(payload, options);
    if (error) {
      return { ok: false, error: `Email didn’t send: ${error.message}` };
    }
    if (!data?.id) {
      return { ok: false, error: "Email didn’t send: Resend returned no id." };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { ok: false, error: `Email didn’t send: ${message}` };
  }
}
