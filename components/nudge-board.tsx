import type { ReactNode } from "react";
import { NudgeActions } from "@/components/nudge-actions";
import { InvoiceEditor, LeadEditor } from "@/components/record-forms";
import { followUpDraftText, formatUsd, invoiceDraftText } from "@/lib/data/draft-text";
import { leadStatusLabel } from "@/lib/data/labels";
import type { Invoice, Lead, Nudge } from "@/lib/data/types";
import { formatScheduledFor } from "@/lib/schedule";

function latestDraft(nudges: Nudge[], relatedId: string): Nudge | undefined {
  return nudges.find((nudge) => nudge.relatedId === relatedId && nudge.status === "draft");
}

function stillInQueue(nudges: Nudge[], relatedId: string, today: string): boolean {
  const latest = nudges.find((nudge) => nudge.relatedId === relatedId);
  if (!latest) return true;
  if (latest.status === "skipped") return false;
  if (latest.status === "sent" && latest.sentAt === today) return false;
  return true;
}

function emailFor(
  kind: Nudge["kind"],
  relatedId: string,
  leads: Lead[],
  invoices: Invoice[],
): string | undefined {
  if (kind === "follow_up") {
    return leads.find((lead) => lead.id === relatedId)?.email;
  }
  return invoices.find((invoice) => invoice.id === relatedId)?.clientEmail;
}

export function NudgeBoard({
  leads,
  invoices,
  allLeads,
  allInvoices,
  nudges,
  today,
  records,
}: {
  leads: Lead[];
  invoices: Invoice[];
  allLeads?: Lead[];
  allInvoices?: Invoice[];
  nudges: Nudge[];
  today: string;
  records?: ReactNode;
}) {
  const followUps = leads.filter((lead) => stillInQueue(nudges, lead.id, today));
  const overdue = invoices.filter((invoice) => stillInQueue(nudges, invoice.id, today));
  const directoryLeads = allLeads ?? leads;
  const directoryInvoices = allInvoices ?? invoices;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-[1.5rem] font-bold tracking-[-0.02em]">
          People to follow up with
        </h2>
        <p className="mb-4 text-muted">
          Quiet leads. Edit the draft, pick a send time if you want, then tap Send email.
        </p>
        {followUps.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-follow-bg p-[1.15rem] text-muted">
            Nobody to chase today. Add a person above, or enjoy the quiet.
          </p>
        ) : (
          <div className="grid gap-3">
            {followUps.map((lead) => {
              const draft = latestDraft(nudges, lead.id);
              return (
                <article
                  key={lead.id}
                  className="rounded-[20px] border border-line bg-card p-[1.15rem]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[1.05rem] font-bold">{lead.name}</h3>
                      <p className="text-[0.92rem] text-muted">
                        {lead.email}
                        {lead.company ? ` · ${lead.company}` : ""}
                      </p>
                      <p className="mt-1 text-[0.9rem] text-muted">
                        {lead.nextFollowUpAt
                          ? `Follow up ${lead.nextFollowUpAt}`
                          : "No follow-up date yet"}
                        {lead.notes ? ` · ${lead.notes}` : ""}
                      </p>
                    </div>
                    <span className="inline-block rounded-full bg-follow-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-follow-fg">
                      {leadStatusLabel(lead.status)}
                    </span>
                  </div>
                  <LeadEditor lead={lead} today={today} />
                  <NudgeActions
                    key={draft?.id ?? `new-${lead.id}`}
                    kind="follow_up"
                    relatedId={lead.id}
                    nudgeId={draft?.id}
                    initialText={draft?.draftText ?? followUpDraftText(lead)}
                    toEmail={lead.email}
                    initialScheduledFor={draft?.scheduledFor}
                    lastError={draft?.lastError}
                    sendAttempts={draft?.sendAttempts}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-[1.5rem] font-bold tracking-[-0.02em]">Overdue invoices</h2>
        <p className="mb-4 text-muted">
          Open bills past their due date. Edit the reminder, pick a send time if you want, then tap
          Send email.
        </p>
        {overdue.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-badge-bg p-[1.15rem] text-muted">
            No overdue invoices. Add a bill above when one is late.
          </p>
        ) : (
          <div className="grid gap-3">
            {overdue.map((invoice) => {
              const draft = latestDraft(nudges, invoice.id);
              return (
                <article
                  key={invoice.id}
                  className="rounded-[20px] border border-line bg-card p-[1.15rem]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[1.05rem] font-bold">
                        {invoice.clientName} · #{invoice.invoiceNumber}
                      </h3>
                      <p className="text-[0.92rem] text-muted">
                        {invoice.clientEmail} · {formatUsd(invoice.amountUsd)}
                      </p>
                      <p className="mt-1 text-[0.9rem] text-muted">
                        Due {invoice.dueDate}
                        {invoice.lastNudgedAt ? ` · last reminded ${invoice.lastNudgedAt}` : ""}
                      </p>
                    </div>
                    <span className="inline-block rounded-full bg-invoice-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-invoice-fg">
                      Overdue
                    </span>
                  </div>
                  <InvoiceEditor invoice={invoice} today={today} />
                  <NudgeActions
                    key={draft?.id ?? `new-${invoice.id}`}
                    kind="invoice"
                    relatedId={invoice.id}
                    nudgeId={draft?.id}
                    initialText={draft?.draftText ?? invoiceDraftText(invoice)}
                    toEmail={invoice.clientEmail}
                    initialScheduledFor={draft?.scheduledFor}
                    lastError={draft?.lastError}
                    sendAttempts={draft?.sendAttempts}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      {records}

      <section>
        <h2 className="mb-1 text-[1.5rem] font-bold tracking-[-0.02em]">Recent nudges</h2>
        <p className="mb-4 text-muted">Drafts, sent notes, and skips.</p>
        {nudges.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-follow-bg p-[1.15rem] text-muted">
            Nothing logged yet. Send or skip a nudge and it’ll show up here.
          </p>
        ) : (
          <div className="grid gap-3">
            {nudges.slice(0, 12).map((nudge) => {
              const tagClass =
                nudge.kind === "invoice"
                  ? "bg-invoice-bg text-invoice-fg"
                  : "bg-follow-bg text-follow-fg";
              return (
                <article
                  key={nudge.id}
                  className="rounded-[20px] border border-line bg-card p-[1.15rem]"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold ${tagClass}`}
                    >
                      {nudge.kind === "invoice" ? "Invoice" : "Follow-up"}
                    </span>
                    <span className="inline-block rounded-full bg-badge-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-badge-fg">
                      {nudge.status}
                    </span>
                    <span className="text-[0.85rem] text-muted">{nudge.createdAt}</span>
                    {nudge.status === "draft" && nudge.scheduledFor ? (
                      <span className="text-[0.85rem] text-follow-fg">
                        Scheduled {formatScheduledFor(nudge.scheduledFor)}
                      </span>
                    ) : null}
                  </div>
                  {nudge.status === "draft" ? (
                    <NudgeActions
                      kind={nudge.kind}
                      relatedId={nudge.relatedId}
                      nudgeId={nudge.id}
                      initialText={nudge.draftText}
                      toEmail={emailFor(nudge.kind, nudge.relatedId, directoryLeads, directoryInvoices)}
                      initialScheduledFor={nudge.scheduledFor}
                      lastError={nudge.lastError}
                      sendAttempts={nudge.sendAttempts}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-[0.95rem] text-bubble">
                      {nudge.draftText}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
