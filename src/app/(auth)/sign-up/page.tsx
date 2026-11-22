import type { Metadata } from "next";
import { AuthShell, TextLink } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Tu centro de control personal empieza aquí."
      footer={
        <>
          ¿Ya tienes cuenta? <TextLink href={ROUTES.login}>Inicia sesión</TextLink>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
