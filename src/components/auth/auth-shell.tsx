import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";

/** Centered card card used by every signed-out screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="ambient" aria-hidden />
      <Link href="/" className="mb-8 rounded-lg px-2 py-1" aria-label="TRACKY, ir al inicio">
        <Logo />
      </Link>
      <Card className="w-full max-w-[420px] animate-rise p-6 sm:p-8">
        <h1 className="text-[26px] leading-tight font-medium text-balance">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{subtitle}</p>
        ) : null}
        <div className="mt-7">{children}</div>
      </Card>
      {footer ? <p className="mt-6 text-center text-[14px] text-fg-muted">{footer}</p> : null}
    </main>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-primary-text underline-offset-4 transition-colors hover:underline"
    >
      {children}
    </Link>
  );
}

export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-3 w-20 rounded bg-surface-strong" />
          <div className="h-12 rounded-[var(--radius-field)] bg-surface" />
        </div>
      ))}
      <div className="mt-2 h-11 rounded-[var(--radius-field)] bg-surface-strong" />
    </div>
  );
}
