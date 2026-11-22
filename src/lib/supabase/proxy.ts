import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/env";
import { DEFAULT_AFTER_LOGIN, ROUTES, isGuestOnlyPath, isProtectedPath } from "@/lib/routes";

/**
 * Refreshes the Supabase session cookie on every matched request and applies
 * optimistic route guards. This is NOT the security boundary — every Server
 * Action / Route Handler re-checks the user, and Postgres RLS enforces access.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it would make
  // random sign-outs very hard to debug. getClaims() validates the JWT.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && isProtectedPath(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = ROUTES.login;
    target.search = "";
    target.searchParams.set("next", pathname + search);
    return redirectWithCookies(target, response);
  }

  if (isSignedIn && isGuestOnlyPath(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = DEFAULT_AFTER_LOGIN;
    target.search = "";
    return redirectWithCookies(target, response);
  }

  return response;
}

/** Redirect while preserving any refreshed auth cookies and no-store headers. */
function redirectWithCookies(target: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
