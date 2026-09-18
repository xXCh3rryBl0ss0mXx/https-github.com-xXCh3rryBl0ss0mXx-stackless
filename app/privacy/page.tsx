import type { Metadata } from "next";
import { PrivacyDocument } from "@/components/legal-privacy";

export const metadata: Metadata = {
  title: "Privacy — Stackless",
  description:
    "What Stackless collects, why, and how to ask for deletion. Operated by Michael Babiy at stackless.lol.",
};

export default function PrivacyPage() {
  return <PrivacyDocument />;
}
