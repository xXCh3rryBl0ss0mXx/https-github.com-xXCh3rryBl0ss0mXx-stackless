import {
  LegalLink,
  LegalMail,
  LegalPage,
  LegalSection,
  type LegalPageVariant,
} from "@/components/legal-page";
import { LEGAL_UPDATED_ON, TERMS_PATH } from "@/lib/legal";

/** Shared Privacy copy — public /privacy and Clerk Manage account both render this. */
export function PrivacyDocument({
  variant = "site",
}: {
  variant?: LegalPageVariant;
}) {
  return (
    <LegalPage
      variant={variant}
      badge="Privacy"
      title="Privacy notes"
      intro={`Last updated ${LEGAL_UPDATED_ON}. These are the current privacy notes for Stackless — written for humans, not a law-firm letterhead.`}
    >
      <LegalSection accent="peach" title="Who this is">
        <p>
          Stackless is operated by Michael Babiy at{" "}
          <LegalLink href="/">stackless.lol</LegalLink>. It’s a $19/month inbox
          helper: follow-ups drafted, unpaid invoices nudged, pipeline kept
          warm.
        </p>
        <p>
          Contact and deletion requests: <LegalMail />.
        </p>
      </LegalSection>

      <LegalSection accent="mint" title="What we collect">
        <p>Only what the product needs to run:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account email, through Clerk (email sign-in — no Google, no phone).
          </li>
          <li>Waitlist email, if you join early access through Clerk.</li>
          <li>
            Subscription status (and the Stripe customer id Stripe needs to bill
            you).
          </li>
          <li>
            Leads, invoices, notes, and nudge drafts you enter in Today’s List —
            names, emails, amounts, due dates, invoice numbers, and the copy you
            write.
          </li>
          <li>
            Emails we send for you through Resend, from hello@stackless.lol to
            the addresses you saved.
          </li>
        </ul>
        <p>
          Production data lives in Neon Postgres. We don’t sell personal data.
        </p>
      </LegalSection>

      <LegalSection accent="lilac" title="Why we have it">
        <p>
          To sign you in, charge $19/month, keep your follow-up list, and send
          the emails you ask us to send — or that you scheduled. We don’t use
          your clients’ details to advertise, and we don’t sell that list.
        </p>
      </LegalSection>

      <LegalSection accent="peach" title="Who helps run this">
        <p>
          These processors see only what they need to do their job:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Clerk — accounts and waitlist</li>
          <li>Stripe — payments and the Customer Portal</li>
          <li>Resend — outbound email</li>
          <li>Neon — Postgres, the production store</li>
          <li>Vercel — hosting</li>
          <li>Grok Bot — helps build and run Stackless</li>
        </ul>
      </LegalSection>

      <LegalSection accent="mint" title="Cookies">
        <p>
          We don’t run a separate analytics cookie farm. Clerk, Stripe, and
          Vercel set cookies they need to sign you in, take payment, and keep
          the site working. That’s it.
        </p>
      </LegalSection>

      <LegalSection accent="lilac" title="Deletion">
        <p>
          You can edit or delete leads, invoices, and drafts in the app. To
          delete your account and the data we hold, email <LegalMail /> and
          our team will handle it. Stripe may keep billing records they are
          required to keep.
        </p>
        <p>
          See also <LegalLink href={TERMS_PATH}>Terms</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
