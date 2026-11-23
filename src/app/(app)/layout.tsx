import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import {
  SidebarNav,
  SidebarNavFallback,
  TabBar,
  TabBarFallback,
} from "@/components/app/sidebar-nav";
import { UserChip, UserChipSkeleton } from "@/components/app/user-chip";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { CommandButton, CommandPalette } from "@/components/app/command-palette";
import { ToastProvider } from "@/components/ui/toast";
import { getContext } from "@/lib/workspace";
import { ROUTES } from "@/lib/routes";

/**
 * Signed-in shell. src/proxy.ts already bounces anonymous visitors; pages
 * re-check through the Data Access Layer (src/lib/auth/session.ts).
 * Session-dependent UI sits behind <Suspense> so the chrome renders instantly.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      <div className="min-h-dvh md:flex">
        <div className="ambient" aria-hidden />
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Saltar al contenido
        </a>

        <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between rounded-none border-y-0 border-l-0 p-4 md:flex">
          <div className="flex flex-col gap-5">
            <Link
              href={ROUTES.dashboard}
              className="rounded-lg px-2 pt-2"
              aria-label="TRACKY, inicio"
            >
              <Logo />
            </Link>
            <Suspense fallback={<div className="h-11 rounded-xl bg-surface" />}>
              <Switcher />
            </Suspense>
            <CommandButton />
            <Suspense fallback={<SidebarNavFallback />}>
              <SidebarNav />
            </Suspense>
          </div>
          <Link
            href={ROUTES.settings}
            className="rounded-2xl p-2 transition-colors hover:bg-surface"
          >
            <Suspense fallback={<UserChipSkeleton />}>
              <UserChip />
            </Suspense>
            <span className="sr-only">, ver ajustes de la cuenta</span>
          </Link>
        </aside>

        <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
          <Link href={ROUTES.dashboard} aria-label="TRACKY, inicio">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Suspense fallback={null}>
              <div className="w-40">
                <Switcher />
              </div>
            </Suspense>
            <CommandButton compact />
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-6 pb-32 sm:px-6 md:px-10 md:pt-10 md:pb-16"
        >
          {children}
        </main>

        <Suspense fallback={<TabBarFallback />}>
          <TabBar />
        </Suspense>
        <CommandPalette />
      </div>
    </ToastProvider>
  );
}

async function Switcher() {
  const { workspaces, workspace } = await getContext();
  return <WorkspaceSwitcher workspaces={workspaces} currentId={workspace.id} />;
}
