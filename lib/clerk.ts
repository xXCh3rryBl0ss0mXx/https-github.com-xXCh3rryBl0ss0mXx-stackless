/** True when a Clerk publishable key is present (starts with pk_test_ or pk_live_). */
export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_");
}

export const clerkAppearance = {
  variables: {
    colorPrimary: "#ff8f66",
    colorBackground: "#ffffff",
    colorText: "#2b2118",
    colorTextSecondary: "#6f5b4a",
    colorNeutral: "#2b2118",
    borderRadius: "1rem",
    fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  },
};
