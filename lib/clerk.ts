import { PRIVACY_PATH, TERMS_PATH } from "./legal";

/** True when a Clerk publishable key is present (starts with pk_test_ or pk_live_). */
export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof key === "string" && key.startsWith("pk_");
}

const cardSurface = "#ffffff";
const pageWash = "#fff8f0";
const line = "#f0e2d4";

/**
 * UserButton popover is a different slot than auth `footer`. Clerk paints that
 * footer with `colorBackground` (cream) behind a smaller-radius main card, so
 * the peach page shows through as a curved seam. One solid white card, no chrome.
 */
const userButtonPopoverElements = {
  userButtonBox: {
    width: "auto",
    maxWidth: "none",
  },
  userButtonPopoverRootBox: {
    width: "auto",
    maxWidth: "none",
    margin: "0",
    background: "transparent",
  },
  popoverBox: {
    background: cardSurface,
    backgroundColor: `${cardSurface} !important`,
    overflow: "hidden",
  },
  userButtonPopoverCard: {
    background: cardSurface,
    backgroundColor: `${cardSurface} !important`,
    overflow: "hidden",
    boxShadow: "0 18px 40px rgba(80, 50, 20, 0.06)",
    border: `1px solid ${line}`,
  },
  userButtonPopoverMain: {
    background: `${cardSurface} !important`,
    backgroundColor: `${cardSurface} !important`,
    borderRadius: "0",
    margin: "0",
    boxShadow: "none",
    border: "none",
  },
  userButtonPopoverFooter: {
    display: "none",
  },
  userButtonPopoverFooterPagesLink: {
    display: "none",
  },
};

/** Profile avatar menu — do not inherit the 28rem auth-card `rootBox`. */
export const clerkUserButtonAppearance = {
  elements: {
    rootBox: {
      width: "auto",
      maxWidth: "none",
      margin: "0",
      background: "transparent",
      display: "inline-flex",
    },
    ...userButtonPopoverElements,
  },
};

/**
 * One continuous card: Clerk’s default splits card + gray footer with inset
 * edges (“dents”). Put the border/radius on cardBox and paint footer white.
 */
export const clerkAppearance = {
  layout: {
    // Public legal pages — not marketing chrome. Footer branding stays hidden.
    termsPageUrl: TERMS_PATH,
    privacyPageUrl: PRIVACY_PATH,
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
    ...userButtonPopoverElements,
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
    // Terms + Privacy on Sign Up (and Sign In). Manage account pages are extra.
    footerPages: {
      background: `${cardSurface} !important`,
      backgroundColor: `${cardSurface} !important`,
      padding: "0 1rem 1rem",
    },
    footerPagesLink: {
      color: "#e07a3a",
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
    // Sidenav already has Terms/Privacy — don’t add a second Clerk footer here.
    footerPages: {
      display: "none",
    },
  },
};
