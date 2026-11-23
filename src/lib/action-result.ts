import type { z } from "zod";
import { toFieldErrors, type FieldErrors } from "@/lib/auth/schemas";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fieldErrors?: FieldErrors): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

export function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors = toFieldErrors(error);
  const first = Object.values(fieldErrors).flat()[0] ?? error.issues[0]?.message;
  return fail(first ?? "Revisa los datos.", fieldErrors);
}
