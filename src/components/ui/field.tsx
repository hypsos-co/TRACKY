import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Validation errors for this field (first one is shown). */
  errors?: string[];
  hint?: ReactNode;
  /** Slot rendered at the right of the label row (e.g. "¿Olvidaste tu contraseña?"). */
  labelAside?: ReactNode;
  /** Slot rendered inside the input, on the right (e.g. a show-password toggle). */
  trailing?: ReactNode;
}

/** Labelled text input with accessible error + hint wiring. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, errors, hint, labelAside, trailing, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const error = errors?.[0];
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-medium text-fg-muted">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "h-12 w-full rounded-[var(--radius-field)] border border-border bg-surface px-4 text-[15px] text-fg",
            "transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-fg-subtle",
            "hover:border-border-strong focus:border-ring focus:bg-surface-strong focus:outline-none",
            "focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--ring)_22%,transparent)]",
            "aria-[invalid=true]:border-danger-text",
            trailing ? "pr-12" : null,
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-[12px] text-fg-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[12px] font-medium text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
});
