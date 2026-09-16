import {
  AddInvoiceCard,
  AddLeadCard,
  InvoiceRecordCard,
  LeadRecordCard,
} from "@/components/record-forms";
import type { Invoice, Lead } from "@/lib/data/types";

export function AddRecords({ today }: { today: string }) {
  return (
    <section className="mb-8">
      <h2 className="mb-1 text-[1.5rem] font-bold tracking-[-0.02em]">Add to the list</h2>
      <p className="mb-4 text-muted">
        New people and invoices. Leave follow-up or due date as today if you want them in
        the queue below.
      </p>
      <div className="grid gap-3 min-[700px]:grid-cols-2">
        <AddLeadCard today={today} />
        <AddInvoiceCard today={today} />
      </div>
    </section>
  );
}

export function AllRecords({
  leads,
  invoices,
  today,
}: {
  leads: Lead[];
  invoices: Invoice[];
  today: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-[1.5rem] font-bold tracking-[-0.02em]">Your people</h2>
        <p className="mb-4 text-muted">Everyone you’re tracking. Edit a date or status anytime.</p>
        {leads.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-card p-[1.15rem] text-muted">
            No people yet. Add someone above.
          </p>
        ) : (
          <div className="grid gap-3">
            {leads.map((lead) => (
              <LeadRecordCard key={lead.id} lead={lead} today={today} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-[1.5rem] font-bold tracking-[-0.02em]">Your invoices</h2>
        <p className="mb-4 text-muted">Open, paid, and void. Edit to keep the overdue queue honest.</p>
        {invoices.length === 0 ? (
          <p className="rounded-[20px] border border-line bg-card p-[1.15rem] text-muted">
            No invoices yet. Add one above.
          </p>
        ) : (
          <div className="grid gap-3">
            {invoices.map((invoice) => (
              <InvoiceRecordCard key={invoice.id} invoice={invoice} today={today} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
