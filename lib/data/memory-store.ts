import { seedInvoices, seedLeads, seedNudges } from "./seed";
import type {
  DataStore,
  Invoice,
  Lead,
  Nudge,
  NudgeKind,
  StoreSnapshot,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export class MemoryDataStore implements DataStore {
  private leads: Lead[];
  private invoices: Invoice[];
  private nudges: Nudge[];
  private nudgeSeq: number;
  private persist?: (snapshot: StoreSnapshot) => void;

  constructor(
    seed?: StoreSnapshot,
    persist?: (snapshot: StoreSnapshot) => void,
  ) {
    this.leads = clone(seed?.leads ?? seedLeads);
    this.invoices = clone(seed?.invoices ?? seedInvoices);
    this.nudges = clone(seed?.nudges ?? seedNudges);
    this.persist = persist;
    this.nudgeSeq = this.nudges.reduce((max, nudge) => {
      const match = /^nudge_(\d+)$/.exec(nudge.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
  }

  async listLeadsNeedingFollowUp(today: string): Promise<Lead[]> {
    return this.leads
      .filter((lead) => {
        if (lead.status === "won" || lead.status === "lost") return false;
        if (!lead.nextFollowUpAt) return true;
        return lead.nextFollowUpAt <= today;
      })
      .map(clone);
  }

  async listOpenInvoices(): Promise<Invoice[]> {
    return this.invoices.filter((invoice) => invoice.status === "open").map(clone);
  }

  async listOverdueInvoices(today: string): Promise<Invoice[]> {
    return this.invoices
      .filter((invoice) => invoice.status === "open" && invoice.dueDate <= today)
      .map(clone);
  }

  async listNudges(): Promise<Nudge[]> {
    return this.nudges
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .map(clone);
  }

  async getLead(id: string): Promise<Lead | null> {
    const lead = this.leads.find((row) => row.id === id);
    return lead ? clone(lead) : null;
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    const invoice = this.invoices.find((row) => row.id === id);
    return invoice ? clone(invoice) : null;
  }

  async createNudgeDraft(input: {
    kind: NudgeKind;
    relatedId: string;
    draftText: string;
    scheduledFor?: string;
  }): Promise<Nudge> {
    this.nudgeSeq += 1;
    const nudge: Nudge = {
      id: `nudge_${String(this.nudgeSeq).padStart(3, "0")}`,
      kind: input.kind,
      relatedId: input.relatedId,
      channel: "email",
      draftText: input.draftText,
      status: "draft",
      scheduledFor: input.scheduledFor,
      createdAt: todayStamp(),
    };
    this.nudges.push(nudge);
    this.flush();
    return clone(nudge);
  }

  async updateNudgeDraft(id: string, draftText: string): Promise<Nudge> {
    const nudge = this.requireNudge(id);
    if (nudge.status !== "draft") {
      throw new Error(`Nudge ${id} is ${nudge.status}, not a draft`);
    }
    nudge.draftText = draftText;
    this.flush();
    return clone(nudge);
  }

  async markNudgeSent(id: string, sentAt: string): Promise<void> {
    const nudge = this.requireNudge(id);
    nudge.status = "sent";
    nudge.sentAt = sentAt;
    if (nudge.kind === "invoice") {
      const invoice = this.invoices.find((row) => row.id === nudge.relatedId);
      if (invoice) invoice.lastNudgedAt = sentAt;
    }
    if (nudge.kind === "follow_up") {
      const lead = this.leads.find((row) => row.id === nudge.relatedId);
      if (lead) lead.lastContactAt = sentAt;
    }
    this.flush();
  }

  async markNudgeSkipped(id: string): Promise<void> {
    const nudge = this.requireNudge(id);
    nudge.status = "skipped";
    this.flush();
  }

  private requireNudge(id: string): Nudge {
    const nudge = this.nudges.find((row) => row.id === id);
    if (!nudge) {
      throw new Error(`No nudge with id ${id}`);
    }
    return nudge;
  }

  private flush() {
    this.persist?.({
      leads: clone(this.leads),
      invoices: clone(this.invoices),
      nudges: clone(this.nudges),
    });
  }
}
