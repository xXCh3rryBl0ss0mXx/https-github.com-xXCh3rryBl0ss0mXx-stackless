import { UnifiedAdd } from "@/components/add-panel";
import { NudgeActions } from "@/components/nudge-actions";
import { InvoiceEditor, InvoiceRecordCard, LeadEditor, LeadRecordCard } from "@/components/record-forms";
import { followUpDraftText, formatUsd, invoiceDraftText } from "@/lib/data/draft-text";
import {
  buildTodayQueue,
  restOfRecords,
  splitRecentNudges,
} from "@/lib/data/today-queue";
import type { Invoice, Lead, Nudge } from "@/lib/data/types";
import { formatScheduledFor } from "@/lib/schedule";

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
}: {
  leads: Lead[];
  invoices: Invoice[];
  allLeads?: Lead[];
  allInvoices?: Invoice[];
  nudges: Nudge[];
  today: string;
}) {
  const directoryLeads = allLeads ?? leads;
  const directoryInvoices = allInvoices ?? invoices;
  const queue = buildTodayQueue(leads, invoices, nudges, today);
  const dueIds = new Set(queue.map((item) => item.id));
  const rest = restOfRecords(directoryLeads, directoryInvoices, dueIds);
  const { strayDrafts, history } = splitRecentNudges(nudges, dueIds);
  const hasAnyRecords = directoryLeads.length + directoryInvoices.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <UnifiedAdd today={today} />

      <section>
        {queue.length === 0 ? (
          <div className="rounded-[24px] border border-line bg-linear-to-b from-white to-phone-wash p-6">
            <p className="text-[1.15rem] font-bold">
              {hasAnyRecords ? "You’re all caught up." : "Nothing on the list yet."}
            </p>
            <p className="mt-2 max-w-[34rem] text-muted">
              {hasAnyRecords
                ? "Nobody to chase right now. Add a person or an invoice above when someone comes to mind."
                : "Add a person you meant to email, or an invoice that’s still open. Name and email first — that’s enough."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {queue.map((item) =>
              item.kind === "follow_up" ? (
                <article
                  key={item.id}
                  className="rounded-[20px] border border-line bg-card p-[1.15rem]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="mb-1 inline-block rounded-full bg-follow-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-follow-fg">
                        Follow-up
                      </span>
                      <h3 className="text-[1.05rem] font-bold">{item.lead.name}</h3>
                      <p className="text-[0.92rem] text-muted">{item.lead.email}</p>
                      <p className="mt-1 text-[0.9rem] text-muted">
                        {item.lead.nextFollowUpAt
                          ? `Follow up ${item.lead.nextFollowUpAt}`
                          : "No follow-up date yet"}
                        {item.lead.notes ? ` · ${item.lead.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <NudgeActions
                    key={item.draft?.id ?? `new-${item.lead.id}`}
                    kind="follow_up"
                    relatedId={item.lead.id}
                    nudgeId={item.draft?.id}
                    initialText={item.draft?.draftText ?? followUpDraftText(item.lead)}
                    toEmail={item.lead.email}
                    initialScheduledFor={item.draft?.scheduledFor}
                    lastError={item.draft?.lastError}
                    sendAttempts={item.draft?.sendAttempts}
                  />
                  <div className="mt-2">
                    <LeadEditor lead={item.lead} today={today} />
                  </div>
                </article>
              ) : (
                <article
                  key={item.id}
                  className="rounded-[20px] border border-line bg-card p-[1.15rem]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="mb-1 inline-block rounded-full bg-invoice-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-invoice-fg">
                        Overdue
                      </span>
                      <h3 className="text-[1.05rem] font-bold">
                        {item.invoice.clientName} · #{item.invoice.invoiceNumber}
                      </h3>
                      <p className="text-[0.92rem] text-muted">
                        {item.invoice.clientEmail} · {formatUsd(item.invoice.amountUsd)}
                      </p>
                      <p className="mt-1 text-[0.9rem] text-muted">
                        Due {item.invoice.dueDate}
                        {item.invoice.lastNudgedAt
                          ? ` · last reminded ${item.invoice.lastNudgedAt}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <NudgeActions
                    key={item.draft?.id ?? `new-${item.invoice.id}`}
                    kind="invoice"
                    relatedId={item.invoice.id}
                    nudgeId={item.draft?.id}
                    initialText={item.draft?.draftText ?? invoiceDraftText(item.invoice)}
                    toEmail={item.invoice.clientEmail}
                    initialScheduledFor={item.draft?.scheduledFor}
                    lastError={item.draft?.lastError}
                    sendAttempts={item.draft?.sendAttempts}
                  />
                  <div className="mt-2">
                    <InvoiceEditor invoice={item.invoice} today={today} />
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      {rest.length > 0 ? (
        <section>
          <h2 className="mb-1 text-[1.15rem] font-bold tracking-[-0.02em] text-muted">
            Everyone else
          </h2>
          <p className="mb-4 text-[0.92rem] text-muted">
            Not due today. Edit a date if you want them back on the list.
          </p>
          <div className="grid gap-3">
            {rest.map((item) =>
              item.kind === "follow_up" ? (
                <LeadRecordCard key={item.id} lead={item.lead} today={today} />
              ) : (
                <InvoiceRecordCard key={item.id} invoice={item.invoice} today={today} />
              ),
            )}
          </div>
        </section>
      ) : null}

      {strayDrafts.length > 0 || history.length > 0 ? (
        <section>
          <h2 className="mb-1 text-[1.15rem] font-bold tracking-[-0.02em] text-muted">Recent</h2>
          <p className="mb-4 text-[0.92rem] text-muted">Sent, skipped, and leftover drafts.</p>
          <div className="grid gap-3">
            {strayDrafts.map((nudge) => {
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
                      Draft
                    </span>
                    {nudge.scheduledFor ? (
                      <span className="text-[0.85rem] text-follow-fg">
                        Scheduled {formatScheduledFor(nudge.scheduledFor)}
                      </span>
                    ) : null}
                  </div>
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
                </article>
              );
            })}
            {history.map((nudge) => {
              const tagClass =
                nudge.kind === "invoice"
                  ? "bg-invoice-bg text-invoice-fg"
                  : "bg-follow-bg text-follow-fg";
              return (
                <article
                  key={nudge.id}
                  className="rounded-[16px] border border-line bg-phone-wash px-4 py-3"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold ${tagClass}`}
                    >
                      {nudge.kind === "invoice" ? "Invoice" : "Follow-up"}
                    </span>
                    <span className="text-[0.8rem] font-semibold text-muted">{nudge.status}</span>
                    <span className="text-[0.8rem] text-muted">{nudge.sentAt ?? nudge.createdAt}</span>
                  </div>
                  <p className="line-clamp-2 text-[0.9rem] text-bubble">{nudge.draftText}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
