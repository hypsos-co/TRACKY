"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AFTER_LOGIN, ROUTES, safeNextPath } from "@/lib/routes";
import { authErrorMessage } from "./errors";
import type { FormState } from "./form-state";
import {
  forgotPasswordSchema,
  formValues,
  loginSchema,
  profileSchema,
  signUpSchema,
  toFieldErrors,
  updatePasswordSchema,
} from "./schemas";

/**
 * Auth Server Actions. Each one validates its input on the server, talks to
 * Supabase Auth with a per-request client, and never trusts the client for
 * authorisation. redirect() throws, so it is always called outside try/catch.
 */

async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData, ["email", "password", "next"] as const);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: toFieldErrors(parsed.error),
      values: { email: raw.email },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: authErrorMessage(error), values: { email: raw.email } };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(raw.next));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData, [
    "displayName",
    "email",
    "password",
    "confirmPassword",
  ] as const);
  const echo = { displayName: raw.displayName, email: raw.email };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values: echo };
  }

  const { email, password, displayName } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}${ROUTES.authCallback}?next=${encodeURIComponent(DEFAULT_AFTER_LOGIN)}`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) {
    return { status: "error", message: authErrorMessage(error), values: echo };
  }

  // With email confirmation disabled Supabase returns a session straight away.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(DEFAULT_AFTER_LOGIN);
  }
  redirect(ROUTES.signUpSuccess);
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = formValues(formData, ["email"] as const);
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values: raw };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}${ROUTES.authCallback}?next=${encodeURIComponent(ROUTES.updatePassword)}`,
  });

  // Rate limits are worth surfacing; anything else gets the same neutral reply
  // so the form can't be used to discover which emails have accounts.
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) {
    return { status: "error", message: authErrorMessage(error), values: raw };
  }
  return {
    status: "success",
    message:
      "Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData, ["password", "confirmPassword"] as const);
  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect(ROUTES.login);

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };

  redirect(`${DEFAULT_AFTER_LOGIN}?password=updated`);
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData, ["displayName", "timezone"] as const);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values: raw };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect(ROUTES.login);

  // RLS ("profiles: owner can update") is the real guard; the id filter just targets the row.
  const { error, count } = await supabase
    .from("profiles")
    .update(
      { display_name: parsed.data.displayName, timezone: parsed.data.timezone },
      { count: "exact" },
    )
    .eq("id", userId);

  if (error || count === 0) {
    return { status: "error", message: "No se pudieron guardar los cambios.", values: raw };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Cambios guardados.", values: raw };
}
