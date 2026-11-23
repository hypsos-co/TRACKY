import { expect, test } from "@playwright/test";
import { expectAccessible } from "./helpers";

test.describe("public pages", () => {
  test("landing says what TRACKY does and offers both entry points", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tu día, tus tareas y lo que mides" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "TRACKY, inicio" })).toBeVisible();
    await expect(page.getByText("Vista previa con datos de ejemplo")).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expectAccessible(page);
  });

  test("login and sign-up pages are accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expectAccessible(page);
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
    await expectAccessible(page);
  });

  test("sign-up validates on the server and keeps what was typed", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Email").fill("no-es-un-email");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Introduce un email válido.")).toBeVisible();
    await expect(page.getByText("Usa al menos 8 caracteres.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue("no-es-un-email");
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("unknown routes are default-deny for anonymous visitors", async ({ page }) => {
    const response = await page.goto("/esta-ruta-no-existe-xyz", { waitUntil: "commit" });
    // Default-deny: anonymous visitors are sent to login before reaching a 404.
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe("route protection", () => {
  for (const path of ["/dashboard", "/settings", "/update-password"]) {
    test(`${path} redirects anonymous visitors to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
    });
  }
});

test.describe("PWA", () => {
  test("serves a valid web app manifest with icons", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const manifest = await res.json();
    expect(manifest.name).toBe("TRACKY");
    expect(manifest.display).toBe("standalone");
    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.ok(), icon.src).toBe(true);
    }
  });
});
