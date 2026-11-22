import type { FieldErrors } from "./schemas";

/** Shape returned by every form Server Action (used with React's useActionState). */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Non-sensitive values echoed back so inputs keep their content after an error. */
  values?: Record<string, string | undefined>;
};

export const initialFormState: FormState = { status: "idle" };
