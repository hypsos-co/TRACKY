import { forwardRef, useId, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[var(--radius-field)] border border-border bg-surface px-3.5 text-[15px] text-fg transition-[border-color,background-color] duration-200 hover:border-border-strong focus:border-ring focus:bg-surface-strong focus:outline-none aria-[invalid=true]:border-danger-text";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { label: string; hideLabel?: boolean; error?: string }
>(function Select({ label, hideLabel, error, className, id, children, ...props }, ref) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={sid}
        className={cn("text-[13px] font-medium text-fg-muted", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={sid}
          aria-invalid={error ? true : undefined}
          className={cn(
            control,
            "h-11 appearance-none pr-9 [&>option]:bg-surface-solid",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
      </div>
      {error ? <p className="text-[12px] font-medium text-danger-text">{error}</p> : null}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }
>(function Textarea({ label, error, className, id, ...props }, ref) {
  const auto = useId();
  const tid = id ?? auto;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={tid} className="text-[13px] font-medium text-fg-muted">
        {label}
      </label>
      <textarea
        ref={ref}
        id={tid}
        aria-invalid={error ? true : undefined}
        className={cn(control, "min-h-24 resize-y py-3 leading-relaxed", className)}
        {...props}
      />
      {error ? <p className="text-[12px] font-medium text-danger-text">{error}</p> : null}
    </div>
  );
});

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border-strong px-6 py-12 text-center">
      <p className="text-[16px] font-medium">{title}</p>
      {children ? (
        <p className="mt-1 max-w-sm text-[14px] leading-relaxed text-fg-muted">{children}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex animate-rise flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[32px] leading-tight font-medium tracking-[-0.03em] sm:text-[40px]">
          {title}
        </h1>
        {description ? <p className="mt-1 text-[15px] text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
