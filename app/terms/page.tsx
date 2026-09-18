import type { Metadata } from "next";
import { TermsDocument } from "@/components/legal-terms";

export const metadata: Metadata = {
  title: "Terms — Stackless",
  description:
    "Current terms for Stackless: $19/month, cancel anytime, and fair use. Operated by Michael Babiy at stackless.lol.",
};

export default function TermsPage() {
  return <TermsDocument />;
}
