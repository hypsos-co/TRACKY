import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { AuthShell, TextLink } from "@/components/auth/auth-shell";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Revisa tu email" };

export default function SignUpSuccessPage() {
  return (
    <AuthShell
      title="Revisa tu email"
      subtitle="Te hemos enviado un enlace para confirmar tu cuenta. Ábrelo desde este dispositivo para entrar directamente."
      footer={
        <>
          ¿Ya la confirmaste? <TextLink href={ROUTES.login}>Inicia sesión</TextLink>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-[14px] text-fg-muted">
        <MailCheck className="size-5 shrink-0 text-success-text" aria-hidden />
        Si no lo ves en unos minutos, mira en la carpeta de spam.
      </div>
    </AuthShell>
  );
}
