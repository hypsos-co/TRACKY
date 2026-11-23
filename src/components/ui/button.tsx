import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  /** Lime call-to-action — the one thing to click on a screen. */
  accent: "bg-accent text-accent-fg hover:brightness-[1.06]",
  /** Royal — the workhorse for secondary actions. */
  primary: "bg-primary text-primary-fg hover:brightness-110",
  /** Raised surface + hairline, primary text. */
  secondary:
    "border border-border bg-surface text-fg shadow-[var(--highlight)] hover:bg-surface-strong",
  /** Text-only. */
  ghost: "text-fg-muted hover:text-fg hover:bg-surface",
  /** Destructive actions (signal pink). */
  danger: "bg-danger text-danger-fg hover:brightness-110",
} as const;

const sizes = {
  sm: "h-9 rounded-lg px-3 text-[13px]",
  md: "h-11 rounded-[var(--radius-field)] px-4 text-[15px]",
  lg: "h-12 rounded-[var(--radius-field)] px-5 text-base",
  icon: "size-10 rounded-[var(--radius-field)]",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses({
  variant = "accent",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 font-medium",
    "transition-[transform,filter,background-color,color] duration-150 ease-[var(--ease-out)]",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
});
