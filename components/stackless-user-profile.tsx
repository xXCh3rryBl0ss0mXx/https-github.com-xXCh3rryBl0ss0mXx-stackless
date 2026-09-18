"use client";

import { UserProfile } from "@clerk/nextjs";
import { PrivacyDocument } from "@/components/legal-privacy";
import { TermsDocument } from "@/components/legal-terms";
import { clerkUserProfileAppearance } from "@/lib/clerk";
import {
  CLERK_USER_PROFILE_PATH,
  CLERK_USER_PROFILE_PRIVACY_URL,
  CLERK_USER_PROFILE_TERMS_URL,
} from "@/lib/clerk-paths";

/** Filled document — same slot size as Clerk’s Profile/Security icons. */
function TermsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 12h8v2H8v-2zm0 4h5v2H8v-2z" />
    </svg>
  );
}

/** Filled shield — Privacy sits next to Terms in the Manage account sidenav. */
function PrivacyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2 4 5v6.5c0 4.5 3.1 8.7 8 10 4.9-1.3 8-5.5 8-10V5l-8-3zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.1-4.1 1.4 1.4L11 16z" />
    </svg>
  );
}

function AccountTermsPage() {
  return <TermsDocument variant="embedded" />;
}

function AccountPrivacyPage() {
  return <PrivacyDocument variant="embedded" />;
}

/**
 * Dedicated `/account` UserProfile. Custom pages belong here (not on UserButton)
 * because Manage account uses `userProfileMode="navigation"`.
 */
export function StacklessUserProfile() {
  return (
    <UserProfile
      routing="path"
      path={CLERK_USER_PROFILE_PATH}
      appearance={clerkUserProfileAppearance}
    >
      <UserProfile.Page
        label="Terms"
        labelIcon={<TermsIcon />}
        url={CLERK_USER_PROFILE_TERMS_URL}
      >
        <AccountTermsPage />
      </UserProfile.Page>
      <UserProfile.Page
        label="Privacy"
        labelIcon={<PrivacyIcon />}
        url={CLERK_USER_PROFILE_PRIVACY_URL}
      >
        <AccountPrivacyPage />
      </UserProfile.Page>
    </UserProfile>
  );
}
