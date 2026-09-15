import type { Metadata } from "next";
import Link from "next/link";
import { EarlyAccessForm, WaitlistSuccess } from "@/components/early-access-form";

export const metadata: Metadata = {
  title: "Get early access — Stackless",
  description: "Join the Stackless waitlist. We’ll email you when a spot opens.",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string }>;
}) {
  const { joined } = await searchParams;

  return (
    <div className="mx-auto w-[min(960px,calc(100%-2rem))] pt-6 pb-12">
      <header className="mb-8 flex items-center justify-between">
        <Link className="text-[1.3rem] font-extrabold text-ink no-underline" href="/">
          Stack<span className="text-logo-accent">less</span>
        </Link>
        <Link
          className="rounded-full border border-line bg-white px-4 py-2 text-[0.9rem] font-semibold text-muted no-underline"
          href="/"
        >
          Back home
        </Link>
      </header>

      <section className="mx-auto max-w-lg rounded-[28px] border border-line bg-card px-6 py-8 shadow-[0_18px_40px_rgba(80,50,20,0.06)]">
        <div className="mb-[0.9rem] inline-block rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
          Early access
        </div>
        <h1 className="mb-3 text-[clamp(1.7rem,4vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          Get early access
        </h1>
        {joined ? (
          <WaitlistSuccess />
        ) : (
          <>
            <p className="mb-6 text-muted">
              Drop your email. We’ll save you a spot and write when Stackless is
              ready.
            </p>
            <EarlyAccessForm />
          </>
        )}
      </section>
    </div>
  );
}
