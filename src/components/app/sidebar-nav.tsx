"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar links. Active: a surface step + the lime "now" dot (signature). */
export function SidebarNav() {
  return <SidebarLinks pathname={usePathname()} />;
}

/** Same links without an active state, for the <Suspense> fallback on dynamic routes. */
export function SidebarNavFallback() {
  return <SidebarLinks pathname="" />;
}

function SidebarLinks({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Principal" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] font-medium transition-colors",
              active
                ? "bg-surface-strong text-fg shadow-[var(--highlight)]"
                : "text-fg-muted hover:bg-surface hover:text-fg",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            {active ? <span className="now-dot" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom tab bar (thumb reach). */
export function TabBar() {
  return <TabLinks pathname={usePathname()} />;
}

export function TabBarFallback() {
  return <TabLinks pathname="" />;
}

function TabLinks({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Principal"
      className="bar-float fixed inset-x-2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-around rounded-[var(--radius-card)] p-1 md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-13 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors",
              active ? "bg-surface-strong text-fg" : "text-fg-muted",
            )}
          >
            {active ? (
              <span className="now-dot absolute top-1.5 right-[calc(50%-17px)]" aria-hidden />
            ) : null}
            <Icon className="size-[18px]" aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
