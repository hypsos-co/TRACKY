"use client";

import { useActionState } from "react";
import { signUp } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { PASSWORD_MIN } from "@/lib/auth/schemas";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignUpForm() {
  const [state, action] = useActionState(signUp, initialFormState);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <Field
        label="Nombre"
        name="displayName"
        autoComplete="given-name"
        placeholder="Cómo quieres que te llamemos"
        defaultValue={state.values?.displayName}
        errors={state.fieldErrors?.displayName}
        hint="Opcional. Puedes cambiarlo después."
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="tu@email.com"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
        hint={`Mínimo ${PASSWORD_MIN} caracteres, con letras y números.`}
      />
      <PasswordField
        label="Repite la contraseña"
        name="confirmPassword"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
