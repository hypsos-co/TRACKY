import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

export type SessionUser = { id: string; email: string };

/**
 * Data Access Layer: the single place that turns the request's cookies into a
 * verified user. getClaims() validates the JWT (locally with asymmetric keys,
 * or against the Auth server otherwise). Deduplicated per request.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  // Supabase checks token expiry against the clock; opt out of prerendering
  // (incl. runtime prefetch) so that happens strictly at request time.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

/** Like getUser(), but redirects to /login when there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(ROUTES.login);
  return user;
}

/** The signed-in user's profile row (RLS guarantees it can only be their own). */
export const getProfile = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, timezone, locale, created_at")
    .eq("id", user.id)
    .single();

  if (error) throw new Error(`No se pudo cargar el perfil: ${error.message}`);
  return { user, profile };
});
