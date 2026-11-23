import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell, FormSkeleton, TextLink } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Con tu email y tu contraseña"
      footer={
        <>
          ¿Aún no tienes cuenta? <TextLink href={ROUTES.signUp}>Crea una</TextLink>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginFormWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  return <LoginForm next={next} />;
}
