"use client";

import { useActionState, useRef } from "react";
import { LocateFixed } from "lucide-react";
import { updateProfile } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProfileForm({
  displayName,
  timezone,
  timezones,
}: {
  displayName: string;
  timezone: string;
  timezones: string[];
}) {
  const [state, action] = useActionState(updateProfile, initialFormState);
  const tzRef = useRef<HTMLSelectElement>(null);
  const tzError = state.fieldErrors?.timezone?.[0];
  const currentTz = state.values?.timezone ?? timezone;

  function useDeviceTimezone() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tzRef.current && timezones.includes(tz)) tzRef.current.value = tz;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.status === "success" ? <Alert tone="success">{state.message}</Alert> : null}
      {state.status === "error" && state.message ? (
        <Alert tone="error">{state.message}</Alert>
      ) : null}

      <Field
        label="Nombre"
        name="displayName"
        autoComplete="name"
        defaultValue={state.values?.displayName ?? displayName}
        errors={state.fieldErrors?.displayName}
        maxLength={80}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="timezone" className="text-[13px] font-medium text-fg-muted">
            Zona horaria
          </label>
          <button
            type="button"
            onClick={useDeviceTimezone}
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-text hover:underline"
          >
            <LocateFixed className="size-3.5" aria-hidden />
            Usar la de este dispositivo
          </button>
        </div>
        <select
          ref={tzRef}
          id="timezone"
          name="timezone"
          key={currentTz}
          defaultValue={currentTz}
          aria-invalid={tzError ? true : undefined}
          aria-describedby={tzError ? "timezone-error" : undefined}
          className="h-12 w-full appearance-none rounded-[var(--radius-field)] border border-border bg-surface px-4 text-[15px] text-fg transition-colors hover:border-border-strong focus:border-ring focus:outline-none [&>option]:bg-surface-solid"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        {tzError ? (
          <p id="timezone-error" className="text-[12px] font-medium text-danger-text">
            {tzError}
          </p>
        ) : null}
      </div>

      <div>
        <SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}
