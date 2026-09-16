import type { Metadata } from "next";
import { NudgeBoard } from "@/components/nudge-board";
import { AddRecords, AllRecords } from "@/components/records-board";
import { getDataStore } from "@/lib/data/store";
import type { Invoice, Lead, Nudge } from "@/lib/data/types";
import { requireSignedIn } from "@/lib/require-signed-in";
import { todayStamp } from "@/lib/today";

export const metadata: Metadata = {
  title: "Today’s List — Stackless",
  description: "Follow-ups and overdue invoices to chase today.",
};

export const dynamic = "force-dynamic";

function StoreError({ message }: { message: string }) {
  return (
    <main>
      <div className="mb-6">
        <div className="mb-[0.9rem] inline-block whitespace-nowrap rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
          Today’s List
        </div>
        <h1 className="mb-2 text-[clamp(1.7rem,4vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          Couldn’t load your list
        </h1>
      </div>
      <p
        role="alert"
        className="rounded-[20px] border border-peach bg-badge-bg p-[1.15rem] font-semibold text-badge-fg"
      >
        {message}
      </p>
    </main>
  );
}

export default async function AppPage() {
  await requireSignedIn();
  const today = todayStamp();

  let dueLeads: Lead[];
  let overdueInvoices: Invoice[];
  let leads: Lead[];
  let invoices: Invoice[];
  let nudges: Nudge[];
  try {
    const store = getDataStore();
    [dueLeads, overdueInvoices, leads, invoices, nudges] = await Promise.all([
      store.listLeadsNeedingFollowUp(today),
      store.listOverdueInvoices(today),
      store.listLeads(),
      store.listInvoices(),
      store.listNudges(),
    ]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong loading today’s list.";
    return <StoreError message={message} />;
  }

  return (
    <main>
      <div className="mb-6">
        <div className="mb-[0.9rem] inline-block whitespace-nowrap rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
          Today’s List
        </div>
        <h1 className="mb-2 text-[clamp(1.7rem,4vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          Who needs a nudge
        </h1>
        <p className="max-w-[40rem] text-muted">
          Add people and invoices, then write the note and tap Send email. We only mark it
          sent if the email really goes out.
        </p>
      </div>
      <AddRecords today={today} />
      <NudgeBoard
        leads={dueLeads}
        invoices={overdueInvoices}
        allLeads={leads}
        allInvoices={invoices}
        nudges={nudges}
        today={today}
        records={<AllRecords leads={leads} invoices={invoices} today={today} />}
      />
    </main>
  );
}
