import { expect, test } from "@playwright/test";
import { PASSWORD, expectAccessible, logIn, passwordInput, signUp, uniqueEmail } from "./helpers";

test.describe("authentication (real Supabase)", () => {
  test("sign up → dashboard → sign out → log back in", async ({ page }) => {
    const email = uniqueEmail("flow");
    await signUp(page, { name: "Ana García", email });

    // The dashboard is titled by the day (no greeting); the name shows in the account link.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Tareas de hoy" })).toBeVisible();
    await expectAccessible(page);

    // Sign out from Ajustes (full page load), then the app is closed again.
    await page.goto("/settings");
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

    // Wrong password → clear, non-revealing error. Email is kept.
    await logIn(page, email, "Incorrecta123");
    await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(email);

    // Right password → back to where the user was going.
    await passwordInput(page).fill(PASSWORD);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Signed-in users are bounced away from guest-only pages.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("login honours a safe ?next= and ignores external ones", async ({ page }) => {
    const email = uniqueEmail("next");
    await signUp(page, { name: "Leo", email });
    await page.context().clearCookies();

    await page.goto("/login?next=/settings");
    await logIn(page, email);
    await expect(page).toHaveURL(/\/settings$/);

    await page.context().clearCookies();
    await page.goto("/login?next=https://evil.example.com");
    await logIn(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("profile changes persist (RLS-protected update)", async ({ page }) => {
    const email = uniqueEmail("profile");
    await signUp(page, { name: "Marta", email });

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
    await page.getByLabel("Nombre").fill("Marta R.");
    await page.getByLabel("Zona horaria").selectOption("Europe/Madrid");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await expectAccessible(page);

    await page.reload();
    await expect(page.getByLabel("Nombre")).toHaveValue("Marta R.");
    await expect(page.getByLabel("Zona horaria")).toHaveValue("Europe/Madrid");

    await page.goto("/dashboard");
    // The sidebar account link carries the name (the sidebar is desktop-only).
    if (!test.info().project.name.includes("mobile"))
      await expect(page.getByRole("link", { name: /Marta R\./ })).toBeVisible();
  });

  test("profile form rejects an empty name", async ({ page }) => {
    await signUp(page, { name: "Iris", email: uniqueEmail("invalid") });
    await page.goto("/settings");
    await page.getByLabel("Nombre").fill("   ");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Escribe cómo quieres que te llamemos.")).toBeVisible();
  });

  test("theme preference applies instantly and survives reloads", async ({ page }) => {
    await signUp(page, { name: "Tema", email: uniqueEmail("theme") });
    await page.goto("/settings");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.getByRole("radio", { name: "Claro" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("radio", { name: "Claro" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expectAccessible(page);
  });
});
