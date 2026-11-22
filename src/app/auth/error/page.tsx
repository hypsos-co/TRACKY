import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { buttonClasses } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth/errors";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Enlace no válido" };

export default function AuthErrorPage({ searchParams }: PageProps<"/auth/error">) {
  return (
    <AuthShell title="No hemos podido verificar el enlace">
      <Suspense fallback={<p className="h-6" />}>
        <Reason searchParams={searchParams} />
      </Suspense>
      <div className="mt-6 flex flex-col gap-3">
        <Link href={ROUTES.login} className={buttonClasses({ size: "lg" })}>
          Ir a iniciar sesión
        </Link>
        <Link href={ROUTES.forgotPassword} className={buttonClasses({ variant: "ghost" })}>
          Pedir un enlace nuevo
        </Link>
      </div>
    </AuthShell>
  );
}

async function Reason({
  searchParams,
}: {
  searchParams: PageProps<"/auth/error">["searchParams"];
}) {
  const { code } = await searchParams;
  const message =
    typeof code === "string" && code !== "missing_token"
      ? authErrorMessage({ code })
      : "El enlace está incompleto o ya se ha usado.";
  return <p className="text-[15px] leading-relaxed text-fg-muted">{message}</p>;
}
