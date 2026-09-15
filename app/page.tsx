import { EarlyAccessButton, LandingHeaderCta } from "@/components/landing-auth";

const chipClass =
  "cursor-pointer whitespace-nowrap rounded-full border border-line bg-white px-4 py-2 font-[inherit] text-[0.9rem] font-semibold text-muted no-underline";

const btnClass =
  "inline-block cursor-pointer rounded-full border-0 bg-linear-to-br from-peach to-btn-end px-[1.35rem] py-[0.9rem] font-[inherit] font-extrabold text-btn-ink no-underline shadow-[0_8px_20px_rgba(255,143,102,0.35)]";

export default function Home() {
  return (
    <div className="mx-auto w-[min(960px,calc(100%-2rem))] pt-6 pb-12">
      <header className="mb-8 flex items-center justify-between">
        <div className="text-[1.3rem] font-extrabold">
          Stack<span className="text-logo-accent">less</span>
        </div>
        <LandingHeaderCta className={chipClass} />
      </header>

      <section className="grid gap-7 rounded-[28px] border border-line bg-card px-6 py-8 shadow-[0_18px_40px_rgba(80,50,20,0.06)] min-[820px]:grid-cols-[1.1fr_0.9fr] min-[820px]:items-center min-[820px]:p-10">
        <div>
          <div className="mb-[0.9rem] inline-block rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
            For freelancers & small agencies
          </div>
          <h1 className="mb-[0.9rem] text-[clamp(1.9rem,4.5vw,2.7rem)] leading-[1.15] font-bold tracking-[-0.03em]">
            Your quiet inbox helper for freelancers
          </h1>
          <p className="mb-[1.4rem] text-[1.05rem] text-muted">
            We remind you so clients don’t disappear — follow-ups drafted,
            unpaid invoices chased, pipeline kept warm.
          </p>
          <EarlyAccessButton className={btnClass} id="go" />
          <p className="mt-[0.8rem] text-[0.95rem] text-muted">
            <strong>Start at $99/month.</strong> Cancel anytime.
          </p>
        </div>
        <aside
          className="rounded-[24px] border border-line bg-linear-to-b from-white to-phone-wash p-4"
          aria-label="Sample messages"
        >
          <div className="mb-3 text-center text-[0.75rem] font-bold tracking-[0.04em] text-muted uppercase">
            Today’s nudges
          </div>
          <div className="mb-[0.7rem] rounded-[18px] border border-line bg-white p-[0.9rem]">
            <span className="mb-[0.4rem] inline-block rounded-full bg-follow-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-follow-fg">
              Follow-up
            </span>
            <p className="text-[0.9rem] text-bubble">
              Hey Sam — just checking in on the website quote I sent Monday.
              Happy to tweak the scope if you want. Want to hop on a quick call
              this week?
            </p>
          </div>
          <div className="rounded-[18px] border border-line bg-white p-[0.9rem]">
            <span className="mb-[0.4rem] inline-block rounded-full bg-invoice-bg px-[0.55rem] py-[0.15rem] text-[0.72rem] font-extrabold text-invoice-fg">
              Invoice nudge
            </span>
            <p className="text-[0.9rem] text-bubble">
              Hi Sam — friendly reminder that invoice #1042 ($850) is still
              open. I can resend the payment link if that helps. Thanks!
            </p>
          </div>
        </aside>
      </section>

      <section className="mt-[2.25rem]">
        <h2 className="mb-3 text-[1.5rem] font-bold tracking-[-0.02em]">
          Stuff slips. That’s normal.
        </h2>
        <p className="mb-[0.9rem] max-w-[40rem] text-muted">
          You’re busy doing the actual work. Someone asked for a quote. You
          meant to reply. The bill is still unpaid. Weeks go by.
        </p>
        <p className="mb-[0.9rem] max-w-[40rem] text-muted">
          Stackless watches those moments. No complicated setup — connect what
          you already use, tell it how you sound, and it keeps your pipeline
          from going quiet.
        </p>
        <div className="mt-5 grid gap-4 min-[700px]:grid-cols-3">
          <div className="rounded-[20px] border border-line bg-card p-[1.15rem]">
            <div className="mb-[0.7rem] h-3 w-3 rounded-full bg-peach" />
            <h3 className="mb-[0.35rem] text-[1.02rem] font-bold">
              Who needs a nudge
            </h3>
            <p className="text-[0.92rem] text-muted">
              See quiet leads before they vanish.
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-card p-[1.15rem]">
            <div className="mb-[0.7rem] h-3 w-3 rounded-full bg-mint" />
            <h3 className="mb-[0.35rem] text-[1.02rem] font-bold">
              Drafts ready
            </h3>
            <p className="text-[0.92rem] text-muted">
              Messages in your voice — edit and send.
            </p>
          </div>
          <div className="rounded-[20px] border border-line bg-card p-[1.15rem]">
            <div className="mb-[0.7rem] h-3 w-3 rounded-full bg-lilac" />
            <h3 className="mb-[0.35rem] text-[1.02rem] font-bold">
              Chase the money
            </h3>
            <p className="text-[0.92rem] text-muted">
              Gentle reminders so invoices don’t sit forever.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-[2.25rem] rounded-[24px] border border-dashed border-cta-line bg-white px-5 py-8 text-center">
        <h2 className="mb-[0.4rem] text-[1.5rem] font-bold tracking-[-0.02em]">
          Keep your pipeline warm
        </h2>
        <p className="mb-4 text-muted">Start at $99/month. Cancel anytime.</p>
        <EarlyAccessButton className={btnClass} />
      </section>

      <footer className="mt-8 text-center text-[0.85rem] text-muted">
        Stackless · main landing
      </footer>
    </div>
  );
}
