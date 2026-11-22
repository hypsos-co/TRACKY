"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar links with a sliding active indicator. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors",
              active ? "text-fg" : "text-fg-muted hover:bg-surface hover:text-fg",
            )}
          >
            {active ? (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl border border-border-strong bg-surface-strong"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <Icon className={cn("relative size-[18px]", active && "text-accent")} aria-hidden />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom tab bar (thumb reach). */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="glass-bar fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-around rounded-full p-1.5 md:hidden"
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors",
              active ? "text-accent-fg" : "text-fg-muted",
            )}
          >
            {active ? (
              <motion.span
                layoutId="tabbar-active"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <Icon className="relative size-5" aria-hidden />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
