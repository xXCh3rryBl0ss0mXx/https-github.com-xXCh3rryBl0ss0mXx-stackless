import type { Metadata } from "next";
import {
  LegalLink,
  LegalMail,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";
import { LEGAL_UPDATED_ON, PRIVACY_PATH } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms — Stackless",
  description:
    "Current terms for Stackless: $19/month, cancel anytime, and fair use. Operated by Michael Babiy at stackless.lol.",
};

export default function TermsPage() {
  return (
    <LegalPage
      badge="Terms"
      title="Terms of use"
      intro={`Last updated ${LEGAL_UPDATED_ON}. These are the current terms for Stackless — written for humans, not a law-firm letterhead.`}
    >
      <LegalSection accent="peach" title="Who this is">
        <p>
          Stackless is the SaaS at{" "}
          <LegalLink href="/">stackless.lol</LegalLink>, operated by Michael
          Babiy. It drafts follow-ups and unpaid-invoice nudges for freelancers
          and small agencies, then sends them by email when you choose — or when
          a send you scheduled is due.
        </p>
        <p>
          Questions: <LegalMail />.
        </p>
      </LegalSection>

      <LegalSection accent="mint" title="$19 a month, cancel anytime">
        <p>
          Stackless costs <strong className="text-ink">$19/month</strong>, billed
          through Stripe. Cancel anytime in Stripe’s Customer Portal, from
          Today’s List or your account page. The workspace needs an active
          subscription; the waitlist is separate.
        </p>
        <p>
          We don’t promise refunds except where Stripe or the law requires them.
        </p>
      </LegalSection>

      <LegalSection accent="lilac" title="Your emails are yours">
        <p>
          You are responsible for the people you add and the words you send.
          Stackless drafts and delivers mail from hello@stackless.lol; you decide
          what goes out. Edit a draft before you send it. We don’t guarantee
          your clients will reply, pay, or stay.
        </p>
      </LegalSection>

      <LegalSection accent="peach" title="Fair use">
        <p>
          Don’t use Stackless to spam, phish, harass, or send anything illegal.
          Don’t try to break the service or use someone else’s account. If we
          see abuse, we can suspend or close the account.
        </p>
      </LegalSection>

      <LegalSection accent="mint" title="If something goes wrong">
        <p>
          Stackless is provided as-is. We work to keep it running, but we don’t
          warrant that every send will land or that the service will always be
          up.
        </p>
        <p>
          To the extent California and US law allow, Michael Babiy / Stackless
          isn’t liable for lost deals, unpaid invoices, or other indirect
          damages. Any liability is limited to what you paid us in the last
          month. This isn’t a registered-company letterhead — there isn’t a
          separate legal entity, address, phone, or EIN listed here because
          there isn’t one to list.
        </p>
      </LegalSection>

      <LegalSection accent="lilac" title="California / United States">
        <p>
          These terms follow the laws of California and the United States. If we
          ever need a court, that’s the frame. Contact: <LegalMail />. See also{" "}
          <LegalLink href={PRIVACY_PATH}>Privacy</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
