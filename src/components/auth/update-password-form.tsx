"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { PASSWORD_MIN } from "@/lib/auth/schemas";
import { Alert } from "@/components/ui/alert";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <PasswordField
        label="Nueva contraseña"
        name="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
        hint={`Mínimo ${PASSWORD_MIN} caracteres, con letras y números.`}
        autoFocus
      />
      <PasswordField
        label="Repite la contraseña"
        name="confirmPassword"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton size="lg" className="w-full" pendingLabel="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
