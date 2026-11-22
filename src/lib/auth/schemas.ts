import { z } from "zod";

/** Mirrors supabase/config.toml: minimum_password_length = 8, letters_digits. */
export const PASSWORD_MIN = 8;
/** bcrypt only uses the first 72 bytes. */
export const PASSWORD_MAX = 72;

const email = z
  .string({ error: "Introduce tu email." })
  .trim()
  .min(1, "Introduce tu email.")
  .max(254, "El email es demasiado largo.")
  .pipe(z.email("Introduce un email válido."));

const newPassword = z
  .string({ error: "Introduce una contraseña." })
  .min(PASSWORD_MIN, `Usa al menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, `Usa como máximo ${PASSWORD_MAX} caracteres.`)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Combina letras y números.");

const displayName = z.string().trim().max(80, "Usa como máximo 80 caracteres.");

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Introduce tu contraseña." }).min(1, "Introduce tu contraseña."),
});

export const signUpSchema = z
  .object({
    displayName: displayName.optional(),
    email,
    password: newPassword,
    confirmPassword: z.string({ error: "Repite la contraseña." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Las contraseñas no coinciden.",
  });

export const forgotPasswordSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string({ error: "Repite la contraseña." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Las contraseñas no coinciden.",
  });

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const profileSchema = z.object({
  displayName: displayName.min(1, "Escribe cómo quieres que te llamemos."),
  timezone: z
    .string()
    .trim()
    .min(1, "Elige una zona horaria.")
    .max(64)
    .refine(isValidTimeZone, "Zona horaria no válida."),
});

export type FieldErrors = Record<string, string[] | undefined>;

/** Turn a ZodError into `{ field: [messages] }`. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/** Read named string fields from FormData (missing → undefined). */
export function formValues<K extends string>(formData: FormData, keys: readonly K[]) {
  const out = {} as Record<K, string | undefined>;
  for (const key of keys) {
    const v = formData.get(key);
    out[key] = typeof v === "string" ? v : undefined;
  }
  return out;
}
