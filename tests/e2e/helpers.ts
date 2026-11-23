import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const PASSWORD = "Tracky2026ok";

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Password inputs, matched exactly so the "Mostrar contraseña" toggle is not picked up. */
export const passwordInput = (page: Page, label = "Contraseña") =>
  page.getByLabel(label, { exact: true });

export async function signUp(page: Page, { name, email }: { name: string; email: string }) {
  await page.goto("/sign-up");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Email").fill(email);
  await passwordInput(page).fill(PASSWORD);
  await passwordInput(page, "Repite la contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await passwordInput(page).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

/** Fails on any serious/critical WCAG 2.1 A/AA violation. */
export async function expectAccessible(page: Page) {
  // Entrance animations fade content in; audit the settled state, not a mid-fade frame.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

/** Nothing wider than the layout viewport (on phones that would zoom the page out). */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
