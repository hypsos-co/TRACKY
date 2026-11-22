import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div className="ambient" aria-hidden />

      <div className="relative animate-rise">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 scale-150 rounded-full bg-[radial-gradient(circle,var(--accent-glow),transparent_65%)] blur-2xl"
        />
        <LogoMark className="size-24 text-fg sm:size-28" />
      </div>

      <h1 className="mt-10 animate-rise [animation-delay:80ms]">
        <Wordmark className="mx-auto h-12 w-auto text-fg sm:h-16" title="TRACKY." />
      </h1>

      <p className="mt-6 max-w-md animate-rise text-lg leading-relaxed text-balance text-fg-muted [animation-delay:160ms] sm:text-xl">
        Tu sistema operativo personal. Hábitos, objetivos, salud y proyectos en un solo lugar.
      </p>

      <div className="mt-10 flex w-full max-w-sm animate-rise flex-col gap-3 [animation-delay:240ms] sm:max-w-none sm:flex-row sm:justify-center">
        <Link href={ROUTES.signUp} className={buttonClasses({ variant: "accent", size: "lg" })}>
          Crear cuenta
        </Link>
        <Link href={ROUTES.login} className={buttonClasses({ variant: "glass", size: "lg" })}>
          Iniciar sesión
        </Link>
      </div>
    </main>
  );
}
