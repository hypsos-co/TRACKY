/**
 * Route access rules, shared by the proxy and the auth actions.
 * Default-deny: any path not listed as public requires a session, so new
 * modules are protected automatically.
 */

export const ROUTES = {
  home: "/",
  login: "/login",
  signUp: "/sign-up",
  signUpSuccess: "/sign-up/success",
  forgotPassword: "/forgot-password",
  updatePassword: "/update-password",
  authCallback: "/auth/callback",
  authError: "/auth/error",
  signOut: "/auth/sign-out",
  dashboard: "/dashboard",
  settings: "/settings",
} as const;

/** Where a signed-in user lands by default. */
export const DEFAULT_AFTER_LOGIN = ROUTES.dashboard;

/** Pages only meant for signed-out visitors; signed-in users are bounced to the app. */
const GUEST_ONLY = new Set<string>([ROUTES.login, ROUTES.signUp, ROUTES.forgotPassword]);

/** Pages anyone can open, signed in or not. */
const PUBLIC_EXACT = new Set<string>([
  ROUTES.home,
  ROUTES.signUpSuccess,
  ROUTES.authCallback,
  ROUTES.authError,
  ROUTES.signOut,
  "/manifest.webmanifest",
  "/robots.txt",
]);

const PUBLIC_PREFIXES = ["/icon", "/apple-icon", "/brand/"];

function normalise(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function isGuestOnlyPath(pathname: string) {
  return GUEST_ONLY.has(normalise(pathname));
}

export function isPublicPath(pathname: string) {
  const p = normalise(pathname);
  return (
    PUBLIC_EXACT.has(p) ||
    GUEST_ONLY.has(p) ||
    PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix))
  );
}

export function isProtectedPath(pathname: string) {
  return !isPublicPath(pathname);
}

/**
 * Sanitise a user-supplied "next" redirect target to prevent open redirects.
 * Only same-origin absolute paths are allowed; anything else falls back.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_AFTER_LOGIN,
): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://tracky.local");
    if (url.origin !== "http://tracky.local") return fallback;
    // Never send someone back into a guest-only page after signing in.
    if (isGuestOnlyPath(url.pathname)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
