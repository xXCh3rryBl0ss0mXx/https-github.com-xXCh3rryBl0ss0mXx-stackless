"use client";

import { useActionState, useState } from "react";
import {
  createInvoiceAction,
  createLeadAction,
  deleteInvoiceAction,
  deleteLeadAction,
  updateInvoiceAction,
  updateLeadAction,
  type RecordActionState,
} from "@/app/app/actions";
import { formatUsd } from "@/lib/data/draft-text";
import { invoiceStatusLabel, leadStatusLabel } from "@/lib/data/labels";
import { INVOICE_STATUSES, LEAD_STATUSES } from "@/lib/data/record-input";
import type { Invoice, Lead } from "@/lib/data/types";

const primaryBtn =
  "cursor-pointer rounded-full border-0 bg-linear-to-br from-peach to-btn-end px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-btn-ink shadow-[0_8px_20px_rgba(255,143,102,0.35)] disabled:cursor-not-allowed disabled:opacity-60";

const quietBtn =
  "cursor-pointer rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[0.9rem] font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-60";

const mintBtn =
  "cursor-pointer rounded-full border-0 bg-mint px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-[#145c3d] disabled:cursor-not-allowed disabled:opacity-60";

const peachBtn =
  "cursor-pointer rounded-full border border-peach bg-badge-bg px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-badge-fg disabled:cursor-not-allowed disabled:opacity-60";

const fieldClass =
  "w-full rounded-[16px] border border-line bg-white px-3 py-2 font-[inherit] text-[0.95rem] text-bubble outline-none focus:border-peach";

const labelClass = "mb-1 block text-[0.82rem] font-bold text-muted";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function ActionError({ state }: { state: RecordActionState | null }) {
  if (!state || state.ok) return null;
  return (
    <p
      role="alert"
      className="rounded-[16px] border border-peach bg-badge-bg px-3 py-2 text-[0.9rem] font-semibold text-badge-fg"
    >
      {state.error}
    </p>
  );
}

function SaveButton({
  pending,
  disabled,
  label,
}: {
  pending: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button className={primaryBtn} type="submit" disabled={disabled ?? pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function EditActions({
  pending,
  submitLabel,
  confirmLine,
  deleteAction,
}: {
  pending: boolean;
  submitLabel: string;
  confirmLine: string;
  deleteAction: (
    state: RecordActionState | null,
    formData: FormData,
  ) => Promise<RecordActionState>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleteState, deleteFormAction, deleting] = useActionState(deleteAction, null);
  const busy = pending || deleting;

  return (
    <>
      <ActionError state={deleteState} />
      {confirming ? (
        <p className="text-[0.92rem] font-semibold text-muted">{confirmLine}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SaveButton pending={pending} disabled={busy} label={submitLabel} />
        {confirming ? (
          <>
            <button
              className={peachBtn}
              formAction={deleteFormAction}
              type="submit"
              disabled={busy}
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              className={quietBtn}
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Never mind
            </button>
          </>
        ) : (
          <button
            className={peachBtn}
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    </>
  );
}

function LeadFields({ lead, today }: { lead?: Lead; today: string }) {
  return (
    <div className="grid gap-3 min-[640px]:grid-cols-2">
      {lead ? <input type="hidden" name="id" value={lead.id} /> : null}
      <Field label="Name">
        <input className={fieldClass} name="name" required defaultValue={lead?.name ?? ""} />
      </Field>
      <Field label="Email">
        <input
          className={fieldClass}
          name="email"
          type="email"
          required
          defaultValue={lead?.email ?? ""}
        />
      </Field>
      <Field label="Company">
        <input className={fieldClass} name="company" defaultValue={lead?.company ?? ""} />
      </Field>
      <Field label="Status">
        <select className={fieldClass} name="status" defaultValue={lead?.status ?? "new"}>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {leadStatusLabel(status)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Follow up on">
        <input
          className={fieldClass}
          name="nextFollowUpAt"
          type="date"
          defaultValue={lead?.nextFollowUpAt ?? today}
        />
      </Field>
      <Field label="Last contact">
        <input
          className={fieldClass}
          name="lastContactAt"
          type="date"
          defaultValue={lead?.lastContactAt ?? ""}
        />
      </Field>
      <Field className="min-[640px]:col-span-2" label="Notes">
        <textarea
          className={`${fieldClass} min-h-[4.5rem] resize-y`}
          name="notes"
          rows={3}
          defaultValue={lead?.notes ?? ""}
        />
      </Field>
    </div>
  );
}

function InvoiceFields({ invoice, today }: { invoice?: Invoice; today: string }) {
  return (
    <div className="grid gap-3 min-[640px]:grid-cols-2">
      {invoice ? <input type="hidden" name="id" value={invoice.id} /> : null}
      <Field label="Client name">
        <input
          className={fieldClass}
          name="clientName"
          required
          defaultValue={invoice?.clientName ?? ""}
        />
      </Field>
      <Field label="Client email">
        <input
          className={fieldClass}
          name="clientEmail"
          type="email"
          required
          defaultValue={invoice?.clientEmail ?? ""}
        />
      </Field>
      <Field label="Invoice number">
        <input
          className={fieldClass}
          name="invoiceNumber"
          required
          defaultValue={invoice?.invoiceNumber ?? ""}
        />
      </Field>
      <Field label="Amount (USD)">
        <input
          className={fieldClass}
          name="amountUsd"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={invoice ? String(invoice.amountUsd) : ""}
        />
      </Field>
      <Field label="Status">
        <select className={fieldClass} name="status" defaultValue={invoice?.status ?? "open"}>
          {INVOICE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {invoiceStatusLabel(status)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Due date">
        <input
          className={fieldClass}
          name="dueDate"
          type="date"
          required
          defaultValue={invoice?.dueDate ?? today}
        />
      </Field>
      <Field className="min-[640px]:col-span-2" label="Payment link">
        <input
          className={fieldClass}
          name="paymentLink"
          type="text"
          placeholder="https://"
          defaultValue={invoice?.paymentLink ?? ""}
        />
      </Field>
    </div>
  );
}

export function LeadForm({
  lead,
  today,
  submitLabel,
  action,
}: {
  lead?: Lead;
  today: string;
  submitLabel: string;
  action: (state: RecordActionState | null, formData: FormData) => Promise<RecordActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.ok && !lead) {
    return (
      <p
        role="status"
        className="rounded-[16px] border border-line bg-follow-bg px-3 py-2 text-[0.9rem] font-semibold text-follow-fg"
      >
        Saved. If the follow-up is today or earlier, they’re on Today’s List.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <LeadFields lead={lead} today={today} />
      <ActionError state={state} />
      {state?.ok ? (
        <p role="status" className="text-[0.9rem] font-semibold text-follow-fg">
          Saved.
        </p>
      ) : null}
      {lead ? (
        <EditActions
          pending={pending}
          submitLabel={submitLabel}
          confirmLine={`Delete ${lead.name}? Draft follow-ups for them go too.`}
          deleteAction={deleteLeadAction}
        />
      ) : (
        <div>
          <SaveButton pending={pending} label={submitLabel} />
        </div>
      )}
    </form>
  );
}

export function InvoiceForm({
  invoice,
  today,
  submitLabel,
  action,
}: {
  invoice?: Invoice;
  today: string;
  submitLabel: string;
  action: (state: RecordActionState | null, formData: FormData) => Promise<RecordActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.ok && !invoice) {
    return (
      <p
        role="status"
        className="rounded-[16px] border border-line bg-follow-bg px-3 py-2 text-[0.9rem] font-semibold text-follow-fg"
      >
        Saved. Open invoices due today or earlier show up in the overdue queue.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <InvoiceFields invoice={invoice} today={today} />
      <ActionError state={state} />
      {state?.ok ? (
        <p role="status" className="text-[0.9rem] font-semibold text-follow-fg">
          Saved.
        </p>
      ) : null}
      {invoice ? (
        <EditActions
          pending={pending}
          submitLabel={submitLabel}
          confirmLine={`Delete invoice #${invoice.invoiceNumber}? Draft reminders for it go too.`}
          deleteAction={deleteInvoiceAction}
        />
      ) : (
        <div>
          <SaveButton pending={pending} label={submitLabel} />
        </div>
      )}
    </form>
  );
}

export function AddLeadCard({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-[20px] border border-line bg-card p-[1.15rem]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[1.05rem] font-bold">Add a person</h3>
          <p className="text-[0.92rem] text-muted">
            Follow-up date today (or earlier) puts them on Today’s List.
          </p>
        </div>
        <button className={open ? quietBtn : mintBtn} type="button" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Add"}
        </button>
      </div>
      {open ? (
        <div className="mt-4">
          <LeadForm today={today} submitLabel="Save person" action={createLeadAction} />
        </div>
      ) : null}
    </article>
  );
}

export function AddInvoiceCard({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-[20px] border border-line bg-card p-[1.15rem]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[1.05rem] font-bold">Add an invoice</h3>
          <p className="text-[0.92rem] text-muted">
            Open + due today (or earlier) lands on the overdue queue.
          </p>
        </div>
        <button className={open ? quietBtn : mintBtn} type="button" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Add"}
        </button>
      </div>
      {open ? (
        <div className="mt-4">
          <InvoiceForm today={today} submitLabel="Save invoice" action={createInvoiceAction} />
        </div>
      ) : null}
    </article>
  );
}

export function LeadEditor({ lead, today }: { lead: Lead; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button className={quietBtn} type="button" onClick={() => setOpen(!open)}>
        {open ? "Close" : "Edit"}
      </button>
      {open ? (
        <div className="mt-3">
          <LeadForm
            lead={lead}
            today={today}
            submitLabel="Save changes"
            action={updateLeadAction}
          />
        </div>
      ) : null}
    </div>
  );
}

export function InvoiceEditor({ invoice, today }: { invoice: Invoice; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button className={quietBtn} type="button" onClick={() => setOpen(!open)}>
        {open ? "Close" : "Edit"}
      </button>
      {open ? (
        <div className="mt-3">
          <InvoiceForm
            invoice={invoice}
            today={today}
            submitLabel="Save changes"
            action={updateInvoiceAction}
          />
        </div>
      ) : null}
    </div>
  );
}

export function LeadRecordCard({ lead, today }: { lead: Lead; today: string }) {
  return (
    <article className="rounded-[20px] border border-line bg-card p-[1.15rem]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[1.05rem] font-bold">{lead.name}</h3>
          <p className="text-[0.92rem] text-muted">
            {lead.email}
            {lead.company ? ` · ${lead.company}` : ""}
          </p>
          <p className="mt-1 text-[0.9rem] text-muted">
            {lead.nextFollowUpAt ? `Follow up ${lead.nextFollowUpAt}` : "No follow-up date yet"}
            {lead.notes ? ` · ${lead.notes}` : ""}
          </p>
        </div>
        <span className="inline-block rounded-full bg-follow-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-follow-fg">
          {leadStatusLabel(lead.status)}
        </span>
      </div>
      <LeadEditor lead={lead} today={today} />
    </article>
  );
}

export function InvoiceRecordCard({ invoice, today }: { invoice: Invoice; today: string }) {
  const tagClass =
    invoice.status === "open" ? "bg-invoice-bg text-invoice-fg" : "bg-badge-bg text-badge-fg";
  return (
    <article className="rounded-[20px] border border-line bg-card p-[1.15rem]">
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
        <span
          className={`inline-block rounded-full px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold ${tagClass}`}
        >
          {invoiceStatusLabel(invoice.status)}
        </span>
      </div>
      <InvoiceEditor invoice={invoice} today={today} />
    </article>
  );
}
