import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Inicio" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

function formatDate(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-ES", { timeZone, ...options }).format(date);
}

async function Dashboard({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard">["searchParams"];
}) {
  const [{ user, profile }, params] = await Promise.all([getProfile(), searchParams]);
  const name = profile.display_name ?? user.email.split("@")[0];
  const todayRaw = formatDate(new Date(), profile.timezone, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const memberSince = formatDate(new Date(profile.created_at), profile.timezone, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-8">
      {params.password === "updated" ? <Alert tone="success">Contraseña actualizada.</Alert> : null}

      <header className="animate-rise">
        <p className="text-[14px] font-medium text-fg-subtle">{today}</p>
        <h1 className="mt-1 text-[34px] leading-tight font-medium tracking-[-0.03em] text-balance sm:text-[44px]">
          Hola, {name}
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="animate-rise p-6 [animation-delay:80ms] md:col-span-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-success-text">
            <Sparkles className="size-4" aria-hidden />
            Fase 1 · Fundación
          </div>
          <h2 className="mt-3 text-[22px] font-medium tracking-[-0.02em]">Tu espacio está listo</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
            Tu cuenta, tu perfil y la seguridad de tus datos ya funcionan. Las tareas, los trackers
            y los widgets de este panel llegan en la Fase 2.
          </p>
          <Link
            href={ROUTES.settings}
            className="group mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-primary-text"
          >
            Personaliza tu perfil
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </Card>

        <Card className="animate-rise p-6 [animation-delay:160ms] md:col-span-2">
          <h2 className="text-[13px] font-medium tracking-[0.08em] text-fg-subtle uppercase">
            Tu cuenta
          </h2>
          <dl className="mt-4 flex flex-col gap-3 text-[14px]">
            <Row term="Email" value={user.email} />
            <Row term="Zona horaria" value={profile.timezone} />
            <Row term="Miembro desde" value={memberSince} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-fg-muted">{term}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-40 rounded bg-surface-strong" />
        <div className="h-10 w-64 rounded-lg bg-surface-strong" />
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <div className="glass h-48 rounded-[var(--radius-card)] md:col-span-3" />
        <div className="glass h-48 rounded-[var(--radius-card)] md:col-span-2" />
      </div>
    </div>
  );
}
