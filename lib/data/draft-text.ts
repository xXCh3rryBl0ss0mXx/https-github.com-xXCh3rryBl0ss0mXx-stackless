import type { Invoice, Lead } from "./types";

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function followUpDraftText(lead: Lead): string {
  const first = firstName(lead.name);
  if (lead.notes) {
    const notes = lead.notes.replace(/\.$/, "");
    return `Hey ${first} — just checking in on this: ${notes}. Happy to tweak the scope if you want. Want to hop on a quick call this week?`;
  }
  return `Hey ${first} — just checking in. Want to hop on a quick call this week?`;
}

export function invoiceDraftText(invoice: Invoice): string {
  const first = firstName(invoice.clientName);
  const amount = formatUsd(invoice.amountUsd);
  return `Hi ${first} — friendly reminder that invoice #${invoice.invoiceNumber} (${amount}) is still open. I can resend the payment link if that helps. Thanks!`;
}
