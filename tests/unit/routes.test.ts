import { describe, expect, it } from "vitest";
import {
  DEFAULT_AFTER_LOGIN,
  isGuestOnlyPath,
  isProtectedPath,
  isPublicPath,
  safeNextPath,
} from "@/lib/routes";

describe("route access rules", () => {
  it.each([
    "/",
    "/login",
    "/sign-up",
    "/sign-up/success",
    "/forgot-password",
    "/auth/callback",
    "/auth/error",
    "/auth/sign-out",
    "/manifest.webmanifest",
    "/icon.svg",
    "/apple-icon.png",
    "/brand/icon-192.png",
  ])("%s is public", (path) => {
    expect(isPublicPath(path)).toBe(true);
    expect(isProtectedPath(path)).toBe(false);
  });

  it.each([
    "/dashboard",
    "/settings",
    "/update-password",
    "/trackers",
    "/anything/new",
    "/dashboard/",
  ])("%s is protected (default-deny)", (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

  it("treats trailing slashes like the bare path", () => {
    expect(isPublicPath("/login/")).toBe(true);
    expect(isGuestOnlyPath("/login/")).toBe(true);
  });

  it("only bounces signed-in users from guest pages", () => {
    expect(isGuestOnlyPath("/login")).toBe(true);
    expect(isGuestOnlyPath("/sign-up")).toBe(true);
    expect(isGuestOnlyPath("/forgot-password")).toBe(true);
    expect(isGuestOnlyPath("/sign-up/success")).toBe(false);
    expect(isGuestOnlyPath("/")).toBe(false);
  });
});

describe("safeNextPath (open-redirect protection)", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("/dashboard?tab=1#x")).toBe("/dashboard?tab=1#x");
  });

  it.each([
    null,
    undefined,
    "",
    "settings",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "/\u0000/x",
  ])("rejects %j", (next) => {
    expect(safeNextPath(next)).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("never sends a signed-in user back to a guest-only page", () => {
    expect(safeNextPath("/login")).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath("/sign-up?x=1")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it("honours a custom fallback", () => {
    expect(safeNextPath(null, "/update-password")).toBe("/update-password");
  });
});
