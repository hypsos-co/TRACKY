import { afterEach, describe, expect, it, vi } from "vitest";
import { authErrorMessage } from "@/lib/auth/errors";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

describe("authErrorMessage", () => {
  it("maps known Supabase codes to Spanish copy", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe(
      "Email o contraseña incorrectos.",
    );
    expect(authErrorMessage({ code: "otp_expired" })).toMatch(/caducado/);
  });

  it("uses the rate-limit message for HTTP 429 without a code", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Demasiados intentos/);
  });

  it("does not leak account existence on sign-up", () => {
    expect(authErrorMessage({ code: "user_already_exists" })).not.toMatch(/existe/i);
  });

  it("falls back to a generic message", () => {
    expect(authErrorMessage({ code: "something_new" })).toBe(
      "Algo ha fallado. Inténtalo de nuevo.",
    );
    expect(authErrorMessage(null)).toBe("Algo ha fallado. Inténtalo de nuevo.");
  });
});

describe("getSupabaseEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("throws a helpful error when unconfigured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("prefers the publishable key and falls back to the anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(getSupabaseEnv().key).toBe("sb_publishable_x");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined as unknown as string);
    expect(getSupabaseEnv().key).toBe("anon");
    expect(isSupabaseConfigured()).toBe(true);
  });
});
