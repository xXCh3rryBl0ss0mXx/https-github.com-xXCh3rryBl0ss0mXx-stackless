/** In-app Clerk routes — never Clerk’s hosted Account Portal. */
export const CLERK_SIGN_IN_PATH = "/sign-in";
export const CLERK_SIGN_UP_PATH = "/sign-up";
export const CLERK_USER_PROFILE_PATH = "/account";
/** Path segments for `<UserProfile.Page />` — `/account/terms`, `/account/privacy`. */
export const CLERK_USER_PROFILE_TERMS_URL = "terms";
export const CLERK_USER_PROFILE_PRIVACY_URL = "privacy";
export const APP_PATH = "/app";

/** Peach `/sign-in`, then back to `returnTo` (usually `/app`) after auth. */
export function peachSignInUrl(returnTo: string): string {
  const params = new URLSearchParams({ redirect_url: returnTo });
  return `${CLERK_SIGN_IN_PATH}?${params.toString()}`;
}
