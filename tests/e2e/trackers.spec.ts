import { expect, test, type Page } from "@playwright/test";
import { expectAccessible, expectNoHorizontalOverflow, signUp, uniqueEmail } from "./helpers";

async function createFromTemplate(page: Page, template: RegExp) {
  await page.goto("/trackers");
  await page.getByRole("button", { name: "Nuevo tracker" }).first().click();
  await page.getByRole("button", { name: template }).click();
  await page.getByRole("button", { name: "Crear tracker" }).click();
  await expect(page).toHaveURL(/\/trackers\/[0-9a-f-]{36}/);
}

async function addWeight(page: Page, day: string, kg: string) {
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo registro" });
  await dialog.getByLabel("Fecha *").fill(day);
  await dialog.getByLabel(/^Peso \*/).fill(kg);
  await dialog.getByRole("button", { name: "Añadir registro" }).click();
  await expect(dialog).toBeHidden();
}

test.describe("Fase 3 · trackers", () => {
  test("plantilla de peso: registros, gráfico, fórmula e importación CSV", async ({ page }) => {
    await signUp(page, { name: "Peso", email: uniqueEmail("trk-weight") });
    await createFromTemplate(page, /Peso corporal/);
    await expect(page.getByRole("heading", { name: /Peso corporal/ })).toBeVisible();

    await addWeight(page, "2026-11-01", "82,4");
    await addWeight(page, "2026-11-08", "81,6");
    await addWeight(page, "2026-11-15", "80,9");
    await page.reload();
    await expect(page.getByText("3 registros")).toBeVisible();

    // Chart view (template default) with its accessible table alternative.
    await expect(page.getByRole("img", { name: /3 puntos, último 80,9/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Ver como tabla" }).click();
    await expect(page.getByRole("cell", { name: "81,6 kg" })).toBeVisible();
    await expectAccessible(page);

    // A formula property computed for every record.
    await page.getByRole("button", { name: "Propiedades" }).click();
    const props = page.getByRole("dialog", { name: "Propiedades" });
    await props.getByRole("button", { name: "Nueva propiedad" }).click();
    await props.getByLabel("Nombre").fill("Sobre 75");
    await props.getByLabel("Tipo").selectOption("formula");
    await props.getByLabel("Fórmula").fill("round({Peso} - 75, 1)");
    await props.getByRole("button", { name: "Guardar propiedad" }).click();
    await expect(page.getByText("Propiedad guardada")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Registros", exact: true }).click();
    await expect(page.getByRole("cell", { name: "5,9" })).toBeVisible();

    // CSV import: invalid rows are reported and skipped.
    await page.getByRole("button", { name: "Importar CSV o Excel" }).click();
    const imp = page.getByRole("dialog", { name: "Importar registros" });
    await imp.locator("input[type=file]").setInputFiles({
      name: "peso.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Fecha;Peso\n2026-11-22;80,1\n2026-11-23;no es un número\n"),
    });
    await expect(imp.getByText(/2 filas · 1 con errores/)).toBeVisible();
    await expectAccessible(page);
    await imp.getByRole("button", { name: "Importar 1 registro" }).click();
    await expect(page.getByText("Importados 1 registro")).toBeVisible();
    await page.reload();
    await expect(page.getByText("4 registros")).toBeVisible();
  });

  test("lecturas en kanban y widget de tracker en el panel", async ({ page }) => {
    await signUp(page, { name: "Lector", email: uniqueEmail("trk-books") });
    await createFromTemplate(page, /Lecturas/);
    await page.getByRole("button", { name: "Nuevo registro" }).click();
    const dialog = page.getByRole("dialog", { name: "Nuevo registro" });
    await dialog.getByLabel("Título *").fill("Dune");
    await dialog.getByLabel("Estado").selectOption({ label: "Leyendo" });
    await dialog.getByRole("button", { name: "Añadir registro" }).click();
    await expect(dialog).toBeHidden();

    const column = (name: string) => page.locator("main").getByRole("region", { name });
    await expect(column("Leyendo, 1").getByRole("button", { name: "Dune" })).toBeVisible();
    // Move it without dragging: the card's status select.
    await page.getByLabel("Mover Dune a").selectOption({ label: "Leído" });
    await expect(column("Leído, 1").getByRole("button", { name: "Dune" })).toBeVisible();
    await page.reload();
    await expect(column("Leído, 1").getByRole("button", { name: "Dune" })).toBeVisible();
    await expectAccessible(page);

    // Dashboard widget for this tracker.
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("button", { name: "Añadir widget" }).click();
    await page
      .getByRole("dialog", { name: "Añadir widget" })
      .getByRole("button", { name: /Último valor/ })
      .click();
    const pick = page.getByRole("dialog", { name: "Último valor" });
    await expect(pick.getByLabel("Tracker")).toHaveValue(/[0-9a-f-]{36}/);
    await pick.getByRole("button", { name: "Añadir widget" }).click();
    await expect(page.getByText("Añadido: Último valor")).toBeVisible();
    await page.getByRole("button", { name: "Listo" }).click();
    const widget = page.getByRole("region", { name: /Lecturas/ });
    await expect(widget.getByText("1 registro")).toBeVisible();
    await expect(widget.getByText(/Último: Dune/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectAccessible(page);
  });
});
