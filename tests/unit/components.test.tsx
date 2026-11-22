import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { Logo, LogoMark, Wordmark } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { initialsOf } from "@/components/app/user-chip";

describe("Field", () => {
  it("links label, input and error for assistive tech", () => {
    render(<Field label="Email" name="email" errors={["Introduce tu email."]} />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Introduce tu email.");
  });

  it("shows the hint only while there is no error", () => {
    const { rerender } = render(<Field label="Nombre" name="n" hint="Opcional." />);
    expect(screen.getByLabelText("Nombre")).toHaveAccessibleDescription("Opcional.");
    rerender(<Field label="Nombre" name="n" hint="Opcional." errors={["Muy largo."]} />);
    expect(screen.queryByText("Opcional.")).not.toBeInTheDocument();
  });
});

describe("PasswordField", () => {
  it("toggles visibility with an accessible button", async () => {
    render(<PasswordField label="Contraseña" name="password" />);
    const input = screen.getByLabelText("Contraseña", { selector: "input" });
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("brand", () => {
  it("exposes the wordmark as an image named TRACKY", () => {
    render(<Wordmark />);
    expect(screen.getByRole("img", { name: "TRACKY" })).toBeInTheDocument();
  });

  it("hides the decorative mark unless titled", () => {
    const { container, rerender } = render(<LogoMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(<LogoMark title="TRACKY" />);
    expect(screen.getByRole("img", { name: "TRACKY" })).toBeInTheDocument();
  });

  it("renders the lock-up", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "TRACKY" })).toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("uses role=alert for errors and role=status otherwise", () => {
    const { rerender } = render(<Alert tone="error">Mal</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Mal");
    rerender(<Alert tone="success">Bien</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Bien");
  });
});

describe("helpers", () => {
  it("buttonClasses merges variants and overrides", () => {
    const cls = buttonClasses({ variant: "danger", size: "sm", className: "h-20" });
    expect(cls).toContain("bg-danger");
    expect(cls).toContain("h-20");
    expect(cls).not.toContain("h-9");
  });

  it("initialsOf derives initials from name or email", () => {
    expect(initialsOf("Ana García", "a@b.c")).toBe("AG");
    expect(initialsOf("Ana", "a@b.c")).toBe("AN");
    expect(initialsOf(null, "zoe@example.com")).toBe("ZO");
    expect(initialsOf("   ", "x@y.z")).toBe("X");
  });
});
