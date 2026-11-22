import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

/** Protected by src/proxy.ts: reached from a recovery email link or from Ajustes. */
export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Elige una nueva contraseña"
      subtitle="La usarás a partir de ahora para entrar."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
