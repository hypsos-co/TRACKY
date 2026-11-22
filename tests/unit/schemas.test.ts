import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  formValues,
  isValidTimeZone,
  loginSchema,
  profileSchema,
  signUpSchema,
  toFieldErrors,
  updatePasswordSchema,
} from "@/lib/auth/schemas";

const fieldErrorsOf = (result: { success: boolean; error?: unknown }) =>
  result.success ? {} : toFieldErrors(result.error as never);

describe("loginSchema", () => {
  it("accepts a valid email/password and trims the email", () => {
    const r = loginSchema.safeParse({ email: "  ana@example.com ", password: "x" });
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("ana@example.com");
  });

  it("explains what is missing", () => {
    const errors = fieldErrorsOf(loginSchema.safeParse({ email: "", password: "" }));
    expect(errors.email?.[0]).toBe("Introduce tu email.");
    expect(errors.password?.[0]).toBe("Introduce tu contraseña.");
  });

  it("rejects malformed emails", () => {
    const errors = fieldErrorsOf(loginSchema.safeParse({ email: "ana@", password: "x" }));
    expect(errors.email?.[0]).toBe("Introduce un email válido.");
  });

  it("handles missing FormData fields", () => {
    const errors = fieldErrorsOf(loginSchema.safeParse({}));
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

describe("signUpSchema", () => {
  const valid = { email: "ana@example.com", password: "secreto123", confirmPassword: "secreto123" };

  it("accepts a valid sign-up with optional display name", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
    expect(signUpSchema.safeParse({ ...valid, displayName: "Ana" }).success).toBe(true);
  });

  it.each([
    ["short1", "Usa al menos 8 caracteres."],
    ["onlyletters", "Combina letras y números."],
    ["12345678", "Combina letras y números."],
    ["a1".repeat(37), "Usa como máximo 72 caracteres."],
  ])("rejects password %j", (password, message) => {
    const errors = fieldErrorsOf(
      signUpSchema.safeParse({ ...valid, password, confirmPassword: password }),
    );
    expect(errors.password).toContain(message);
  });

  it("requires matching confirmation", () => {
    const errors = fieldErrorsOf(
      signUpSchema.safeParse({ ...valid, confirmPassword: "otra12345" }),
    );
    expect(errors.confirmPassword?.[0]).toBe("Las contraseñas no coinciden.");
  });

  it("caps display name length", () => {
    const errors = fieldErrorsOf(signUpSchema.safeParse({ ...valid, displayName: "x".repeat(81) }));
    expect(errors.displayName).toBeDefined();
  });
});

describe("other schemas", () => {
  it("forgotPasswordSchema validates email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("updatePasswordSchema enforces rules and confirmation", () => {
    expect(
      updatePasswordSchema.safeParse({ password: "nueva1234", confirmPassword: "nueva1234" })
        .success,
    ).toBe(true);
    expect(
      updatePasswordSchema.safeParse({ password: "nueva1234", confirmPassword: "x" }).success,
    ).toBe(false);
  });

  it("profileSchema requires a name and a real IANA time zone", () => {
    expect(profileSchema.safeParse({ displayName: "Ana", timezone: "Europe/Madrid" }).success).toBe(
      true,
    );
    const errors = fieldErrorsOf(
      profileSchema.safeParse({ displayName: "  ", timezone: "Mars/Olympus" }),
    );
    expect(errors.displayName?.[0]).toBe("Escribe cómo quieres que te llamemos.");
    expect(errors.timezone?.[0]).toBe("Zona horaria no válida.");
  });

  it("isValidTimeZone", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("America/Mexico_City")).toBe(true);
    expect(isValidTimeZone("Nope/Nope")).toBe(false);
  });
});

describe("formValues", () => {
  it("reads string fields and ignores files/missing keys", () => {
    const fd = new FormData();
    fd.set("email", "ana@example.com");
    fd.set("file", new Blob(["x"]));
    expect(formValues(fd, ["email", "file", "missing"] as const)).toEqual({
      email: "ana@example.com",
      file: undefined,
      missing: undefined,
    });
  });
});
