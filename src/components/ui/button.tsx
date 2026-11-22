import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  /** Lime call-to-action — the one thing to click on a screen. */
  accent:
    "bg-accent text-accent-fg shadow-[0_8px_30px_-8px_var(--accent-glow)] hover:brightness-[1.06]",
  /** Royal — the workhorse for secondary actions. */
  primary: "bg-primary text-primary-fg hover:brightness-110",
  /** Frosted glass button. */
  glass: "glass text-fg hover:bg-surface-strong",
  /** Text-only. */
  ghost: "text-fg-muted hover:text-fg hover:bg-surface",
  /** Destructive actions (signal pink). */
  danger: "bg-danger text-danger-fg hover:brightness-110",
} as const;

const sizes = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
  icon: "size-10",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses({
  variant = "accent",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em]",
    "transition-[transform,filter,background-color,color,box-shadow] duration-200 ease-[var(--ease-out)]",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
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
