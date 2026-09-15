/** True when a Clerk publishable key is present (starts with pk_test_ or pk_live_). */
export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_");
}

const cardSurface = "#ffffff";

export const clerkAppearance = {
  variables: {
    colorPrimary: "#ff8f66",
    colorBackground: cardSurface,
    colorText: "#2b2118",
    colorTextSecondary: "#6f5b4a",
    colorNeutral: "#2b2118",
    borderRadius: "1.25rem",
    fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { boxShadow: "none" },
    card: {
      background: cardSurface,
      boxShadow: "0 18px 40px rgba(80, 50, 20, 0.06)",
      border: "1px solid #f0e2d4",
      borderRadius: "28px",
    },
    footer: {
      background: cardSurface,
      backgroundColor: cardSurface,
    },
    footerAction: {
      background: cardSurface,
      backgroundColor: cardSurface,
    },
    identityPreview: {
      background: "#fff8f0",
    },
  },
};
