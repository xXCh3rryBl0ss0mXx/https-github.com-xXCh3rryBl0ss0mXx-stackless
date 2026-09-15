/** True when a Clerk publishable key is present (starts with pk_test_ or pk_live_). */
export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_");
}

const cardSurface = "#ffffff";
const pageWash = "#fff8f0";
const line = "#f0e2d4";

/**
 * One continuous card: Clerk’s default splits card + gray footer with inset
 * edges (“dents”). Put the border/radius on cardBox and paint footer white.
 */
export const clerkAppearance = {
  layout: {
    // Prefer no marketing links in the component chrome
    termsPageUrl: undefined,
    privacyPageUrl: undefined,
    helpPageUrl: undefined,
  },
  variables: {
    colorPrimary: "#ff8f66",
    colorBackground: pageWash, // cream during step loads — avoids white flash
    colorInputBackground: cardSurface,
    colorText: "#2b2118",
    colorTextSecondary: "#6f5b4a",
    colorNeutral: "#2b2118",
    borderRadius: "1rem",
    fontFamily: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  },
  elements: {
    rootBox: {
      width: "100%",
      maxWidth: "28rem",
      margin: "0 auto",
      background: "transparent",
      display: "flex",
      justifyContent: "center",
    },
    // Soft peach dimmer instead of a black flash between Clerk steps
    modalBackdrop: {
      background: "rgba(255, 248, 240, 0.78)",
      backdropFilter: "blur(6px)",
    },
    modalContent: {
      background: "transparent",
    },
    spinner: {
      color: "#ff8f66",
    },
    cardBox: {
      boxShadow: "0 18px 40px rgba(80, 50, 20, 0.06)",
      border: `1px solid ${line}`,
      borderRadius: "28px",
      overflow: "hidden",
      background: cardSurface,
    },
    card: {
      background: cardSurface,
      boxShadow: "none",
      border: "none",
      borderRadius: "0",
      margin: "0",
    },
    main: {
      background: cardSurface,
    },
    headerTitle: {
      color: "#2b2118",
    },
    headerSubtitle: {
      color: "#6f5b4a",
    },
    socialButtonsBlockButton: {
      border: `1px solid ${line}`,
      background: cardSurface,
    },
    formFieldInput: {
      background: cardSurface,
      borderColor: line,
    },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #ffb48a, #ff8f66)",
      color: "#3a1d0c",
      boxShadow: "0 8px 20px rgba(255, 143, 102, 0.35)",
    },
    footer: {
      background: `${cardSurface} !important`,
      backgroundColor: `${cardSurface} !important`,
      margin: "0",
      padding: "0",
      borderTop: `1px solid ${line}`,
      borderRadius: "0",
      boxShadow: "none",
    },
    footerAction: {
      background: `${cardSurface} !important`,
      backgroundColor: `${cardSurface} !important`,
      margin: "0",
      padding: "1rem",
      borderRadius: "0",
    },
    footerActionLink: {
      color: "#e07a3a",
    },
    footerPages: {
      display: "none",
    },
    // "Secured by Clerk" / logo row
    logoBox: {
      display: "none",
    },
    logoImage: {
      display: "none",
    },
    // "Development mode" badge
    badge: {
      display: "none",
    },
    identityPreview: {
      background: pageWash,
      borderColor: line,
    },
  },
};

/** Wider peach card for `<UserProfile />` — same colors as sign-in, not a dark portal. */
export const clerkUserProfileAppearance = {
  layout: clerkAppearance.layout,
  variables: clerkAppearance.variables,
  elements: {
    ...clerkAppearance.elements,
    rootBox: {
      width: "100%",
      maxWidth: "56rem",
      margin: "0 auto",
      background: "transparent",
      display: "flex",
      justifyContent: "center",
    },
    navbar: {
      background: pageWash,
      borderColor: line,
    },
    navbarButton: {
      color: "#2b2118",
    },
    navbarButtonIcon: {
      color: "#6f5b4a",
    },
    scrollBox: {
      background: cardSurface,
      boxShadow: "none",
    },
    pageScrollBox: {
      background: cardSurface,
    },
    profileSectionTitle: {
      color: "#2b2118",
    },
  },
};
