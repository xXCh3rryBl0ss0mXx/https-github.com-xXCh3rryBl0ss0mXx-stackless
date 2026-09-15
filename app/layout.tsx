import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { clerkAppearance, isClerkConfigured } from "@/lib/clerk";
import "./globals.css";

const cream = "#fff8f0";

export const metadata: Metadata = {
  themeColor: "#fff8f0",
  title: "Stackless — never lose a client because you forgot to follow up",
  description:
    "We remind you so clients don’t disappear — follow-ups drafted, unpaid invoices chased, pipeline kept warm.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light", backgroundColor: cream }}>
      <body style={{ backgroundColor: cream }}>
        {isClerkConfigured() ? (
          <ClerkProvider
            appearance={clerkAppearance}
            waitlistUrl="/waitlist"
            signUpUrl="/sign-up"
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
