import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { CONTACT_EMAIL } from "@/lib/legal";

const chipClass =
  "rounded-full border border-line bg-white px-4 py-2 text-[0.9rem] font-semibold text-muted no-underline";

export function LegalPage({
  badge,
  title,
  intro,
  children,
}: {
  badge: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-[min(960px,calc(100%-2rem))] pt-6 pb-12">
      <header className="mb-8 flex items-center justify-between">
        <Link className="text-[1.3rem] font-extrabold text-ink no-underline" href="/">
          Stack<span className="text-logo-accent">less</span>
        </Link>
        <Link className={chipClass} href="/">
          Back home
        </Link>
      </header>

      <article>
        <div className="mb-[0.9rem] inline-block rounded-full bg-badge-bg px-3 py-[0.3rem] text-[0.8rem] font-bold text-badge-fg">
          {badge}
        </div>
        <h1 className="mb-3 text-[clamp(1.7rem,4vw,2.2rem)] leading-[1.15] font-bold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mb-6 max-w-[40rem] text-[1.05rem] text-muted">{intro}</p>
        <div className="grid gap-4">{children}</div>
      </article>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  accent,
  title,
  children,
}: {
  accent: "peach" | "mint" | "lilac";
  title: string;
  children: ReactNode;
}) {
  const dot =
    accent === "peach" ? "bg-peach" : accent === "mint" ? "bg-mint" : "bg-lilac";

  return (
    <section className="rounded-[20px] border border-line bg-card p-[1.15rem] min-[700px]:p-6">
      <div className={`mb-[0.7rem] h-3 w-3 rounded-full ${dot}`} />
      <h2 className="mb-[0.45rem] text-[1.15rem] font-bold tracking-[-0.02em]">
        {title}
      </h2>
      <div className="max-w-[40rem] space-y-3 text-[0.98rem] text-muted">
        {children}
      </div>
    </section>
  );
}

export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="font-semibold text-logo-accent no-underline hover:underline" href={href}>
      {children}
    </Link>
  );
}

export function LegalMail() {
  return (
    <a
      className="font-semibold text-logo-accent no-underline hover:underline"
      href={`mailto:${CONTACT_EMAIL}`}
    >
      {CONTACT_EMAIL}
    </a>
  );
}
