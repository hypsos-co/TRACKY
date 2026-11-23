import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="ambient" aria-hidden />
      <LogoMark className="size-14 text-fg-subtle" />
      <h1 className="mt-6 text-[28px] font-medium">Esta página no existe</h1>
      <p className="mt-2 text-fg-muted">
        Puede que el enlace esté mal escrito o que la página se haya movido.
      </p>
      <Link href="/" className={buttonClasses({ className: "mt-8" })}>
        Volver al inicio
      </Link>
    </main>
  );
}
