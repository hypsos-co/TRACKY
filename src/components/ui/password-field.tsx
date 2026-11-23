"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, type FieldProps } from "./field";

/** Password input with an accessible show/hide toggle. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, "type" | "trailing">>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <Field
        ref={ref}
        type={visible ? "text" : "password"}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-strong hover:text-fg"
          >
            {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        }
        {...props}
      />
    );
  },
);
