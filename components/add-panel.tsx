"use client";

import { useState } from "react";
import { createInvoiceAction, createLeadAction } from "@/app/app/actions";
import { InvoiceForm, LeadForm } from "@/components/record-forms";

const mintBtn =
  "cursor-pointer rounded-full border-0 bg-mint px-4 py-2 font-[inherit] text-[0.9rem] font-extrabold text-[#145c3d] disabled:cursor-not-allowed disabled:opacity-60";

const quietBtn =
  "cursor-pointer rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[0.9rem] font-semibold text-muted disabled:cursor-not-allowed disabled:opacity-60";

const kindOff =
  "cursor-pointer rounded-full border border-line bg-white px-3 py-[0.35rem] font-[inherit] text-[0.82rem] font-extrabold text-muted";

const personOn =
  "cursor-pointer rounded-full border-0 bg-mint px-3 py-[0.35rem] font-[inherit] text-[0.82rem] font-extrabold text-[#145c3d]";

const invoiceOn =
  "cursor-pointer rounded-full border-0 bg-invoice-bg px-3 py-[0.35rem] font-[inherit] text-[0.82rem] font-extrabold text-invoice-fg";

type AddKind = "person" | "invoice";

export function UnifiedAdd({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AddKind>("person");
  const [formKey, setFormKey] = useState(0);

  function choose(next: AddKind) {
    setKind(next);
    setFormKey((key) => key + 1);
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setKind("person");
    setFormKey((key) => key + 1);
    setOpen(true);
  }

  return (
    <section className="mb-6">
      <article className="rounded-[20px] border border-line bg-linear-to-b from-white to-phone-wash p-[1.15rem]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[1.05rem] font-bold">Add</h2>
            <p className="text-[0.92rem] text-muted">
              One place for a person or an invoice. Name and email first.
            </p>
          </div>
          <button className={open ? quietBtn : mintBtn} type="button" onClick={toggle}>
            {open ? "Close" : "Add"}
          </button>
        </div>
        {open ? (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="What to add">
              <button
                className={kind === "person" ? personOn : kindOff}
                type="button"
                aria-pressed={kind === "person"}
                onClick={() => choose("person")}
              >
                Person
              </button>
              <button
                className={kind === "invoice" ? invoiceOn : kindOff}
                type="button"
                aria-pressed={kind === "invoice"}
                onClick={() => choose("invoice")}
              >
                Invoice
              </button>
            </div>
            {kind === "person" ? (
              <LeadForm
                key={`person-${formKey}`}
                today={today}
                submitLabel="Save person"
                action={createLeadAction}
              />
            ) : (
              <InvoiceForm
                key={`invoice-${formKey}`}
                today={today}
                submitLabel="Save invoice"
                action={createInvoiceAction}
              />
            )}
          </div>
        ) : null}
      </article>
    </section>
  );
}
