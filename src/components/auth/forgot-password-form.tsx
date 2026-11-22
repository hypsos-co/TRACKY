"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);

  if (state.status === "success") {
    return <Alert tone="success">{state.message}</Alert>;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
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
      <SubmitButton size="lg" className="w-full" pendingLabel="Enviando…">
        Enviar enlace
      </SubmitButton>
    </form>
  );
}
