import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTES, safeNextPath } from "@/lib/routes";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Landing point for every email link and (later) OAuth provider.
 * Supports both the PKCE `?code=` flow and the `?token_hash=&type=` flow used
 * by custom email templates (works across devices). See docs/ARCHITECTURE.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? ROUTES.updatePassword : undefined;
  const next = safeNextPath(searchParams.get("next"), fallback);

  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  if (providerError) return toError(origin, providerError);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return toError(origin, error.code ?? "exchange_failed");
  }

  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return toError(origin, error.code ?? "verify_failed");
  }

  return toError(origin, "missing_token");
}

function toError(origin: string, code: string) {
  const url = new URL(ROUTES.authError, origin);
  url.searchParams.set("code", code.slice(0, 64));
  return NextResponse.redirect(url);
}
