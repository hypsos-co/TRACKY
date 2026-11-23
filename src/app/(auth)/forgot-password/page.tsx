import type { Metadata } from "next";
import { AuthShell, TextLink } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva"
      footer={
        <>
          ¿La recordaste? <TextLink href={ROUTES.login}>Vuelve a entrar</TextLink>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
