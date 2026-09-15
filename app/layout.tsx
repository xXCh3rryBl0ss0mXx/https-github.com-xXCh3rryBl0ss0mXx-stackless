import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { clerkAppearance, isClerkConfigured } from "@/lib/clerk";
import "./globals.css";

export const metadata: Metadata = {
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
    <html lang="en">
      <body>
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
