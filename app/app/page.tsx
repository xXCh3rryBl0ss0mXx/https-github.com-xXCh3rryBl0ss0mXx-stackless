import type { Metadata } from "next";
import { NudgeBoard } from "@/components/nudge-board";
import { getDataStore } from "@/lib/data/store";
import { requireSignedIn } from "@/lib/require-signed-in";
import { todayStamp } from "@/lib/today";

export const metadata: Metadata = {
  title: "Today’s List — Stackless",
  description: "Follow-ups and overdue invoices to chase today.",
};

export const dynamic = "force-dynamic";

export default async function AppPage() {
  await requireSignedIn();
  const store = getDataStore();
  const today = todayStamp();
  const [leads, invoices, nudges] = await Promise.all([
    store.listLeadsNeedingFollowUp(today),
    store.listOverdueInvoices(today),
    store.listNudges(),
  ]);

  return (
    <main>
      <div className="mb-6">
        <div className="mb-[0.9rem] inline-block rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
          Today’s List
        </div>
        <h1 className="mb-2 text-[clamp(1.7rem,4vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          Who needs a nudge
        </h1>
        <p className="max-w-[40rem] text-muted">
          Write the note, then tap Send email. We only mark it sent if the
          email really goes out.
        </p>
      </div>
      <NudgeBoard leads={leads} invoices={invoices} nudges={nudges} today={today} />
    </main>
  );
}
