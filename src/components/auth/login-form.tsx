"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { ROUTES } from "@/lib/routes";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextLink } from "./auth-shell";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialFormState);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="tu@email.com"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
        autoFocus
      />
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
        labelAside={<TextLink href={ROUTES.forgotPassword}>¿La olvidaste?</TextLink>}
      />
      <SubmitButton size="lg" className="mt-1 w-full" pendingLabel="Entrando…">
        Iniciar sesión
      </SubmitButton>
    </form>
  );
}
