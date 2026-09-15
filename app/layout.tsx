import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stackless — never lose a client because you forgot to follow up",
  description:
    "We remind you so clients don’t disappear — follow-ups drafted, unpaid invoices chased, pipeline kept warm.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
