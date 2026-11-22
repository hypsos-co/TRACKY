import { expect, test } from "@playwright/test";
import { expectAccessible, signUp, uniqueEmail } from "./helpers";

test.describe("Fase 2 · núcleo", () => {
  test("tareas: alta en lenguaje natural, subtarea, completar y persistir", async ({ page }) => {
    await signUp(page, { name: "Tareas", email: uniqueEmail("tasks") });
    await page.goto("/tasks");
    const add = page.getByLabel("Añadir tarea");
    await add.fill("Comprar pan mañana 9h !alta #casa");
    await add.press("Enter");
    await expect(page.getByText("Comprar pan", { exact: true })).toBeVisible();
    await expect(page.locator("main li").getByText("#casa")).toBeVisible();
    await expect(page.locator("main li").getByText("Alta", { exact: true })).toBeVisible();

    await add.fill("Revisar informe hoy");
    await add.press("Enter");
    await page.getByRole("button", { name: "Completar: Revisar informe" }).click();
    await expect(page.getByText("Tarea completada")).toBeVisible();

    await page.getByRole("button", { name: "Comprar pan", exact: true }).click();
    await page.getByLabel("Nueva subtarea").fill("Integral");
    await page.getByRole("button", { name: "Añadir", exact: true }).click();
    await expect(page.getByRole("dialog").getByText("Integral")).toBeVisible();
    await expectAccessible(page);
    await page.keyboard.press("Escape");

    await page.reload();
    await expect(page.getByText("0/1")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Marcar como pendiente: Revisar informe" }),
    ).toHaveCount(0); // done section collapsed
    await expectAccessible(page);
  });

  test("proyectos: crear, añadir tareas y progreso calculado", async ({ page }) => {
    await signUp(page, { name: "Proyectos", email: uniqueEmail("projects") });
    await page.goto("/projects");
    await page.getByRole("button", { name: "Nuevo proyecto" }).first().click();
    await page.getByLabel("Nombre").fill("Lanzar web");
    await page.getByRole("button", { name: "Crear proyecto" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);

    const add = page.getByLabel("Añadir tarea");
    await add.fill("Diseñar portada hoy");
    await add.press("Enter");
    await expect(page.getByText("Diseñar portada", { exact: true })).toBeVisible();
    await add.fill("Escribir textos");
    await add.press("Enter");
    await expect(page.getByText("Escribir textos", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Completar: Diseñar portada" }).click();
    await expect(page.getByText("Tarea completada")).toBeVisible();
    await page.reload();
    await expect(page.getByText("1/2 · 50%")).toBeVisible();
    await expectAccessible(page);
  });

  test("calendario: crear un evento y moverlo arrastrando", async ({ page, isMobile }) => {
    test.skip(
      isMobile,
      "El arrastre con ratón se prueba en escritorio; en móvil se edita desde el diálogo.",
    );
    await signUp(page, { name: "Agenda", email: uniqueEmail("calendar") });
    await page.goto("/calendar?view=week");
    await page.getByRole("button", { name: "Nuevo evento", exact: true }).click();
    await page.getByLabel("Título").fill("Reunión equipo");
    await page.getByLabel("Hora de inicio").fill("10:00");
    await page.getByLabel("Hora de fin").fill("11:30");
    await page.getByRole("button", { name: "Crear evento", exact: true }).click();
    const event = page.getByRole("button", { name: /Reunión equipo\s*10:00–11:30/ });
    await expect(event).toBeVisible();
    await expectAccessible(page);

    const box = (await event.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 10);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, box.y + 10 + 96, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByText("Evento movido")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: /Reunión equipo\s*12:00–13:30/ })).toBeVisible();

    for (const view of ["day", "month", "year"]) {
      await page.goto(`/calendar?view=${view}`);
      await expect(page.getByRole("heading", { name: "Calendario" })).toBeVisible();
    }
  });

  test("dashboard: widgets reales, añadir uno y que persista", async ({ page }) => {
    await signUp(page, { name: "Panel", email: uniqueEmail("dashboard") });
    await expect(page.getByRole("region", { name: "Tareas de hoy" })).toBeVisible();
    await page.getByLabel("Añadir tarea").fill("Llamar al banco hoy");
    await page.getByLabel("Añadir tarea").press("Enter");
    await expect(
      page.getByRole("region", { name: "Tareas de hoy" }).getByText("Llamar al banco"),
    ).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("button", { name: "Personalizar" }).click();
    await page.getByRole("button", { name: "Añadir widget" }).first().click();
    await page.getByRole("button", { name: /^Calendario/ }).click();
    await expect(page.getByText("Añadido: Calendario")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Calendario" })).toBeVisible();
  });

  test("⌘K busca en todo el espacio y crea tareas", async ({ page, isMobile }) => {
    await signUp(page, { name: "Buscar", email: uniqueEmail("search") });
    await page.goto("/tasks");
    await page.getByLabel("Añadir tarea").fill("Preparar presupuesto");
    await page.getByLabel("Añadir tarea").press("Enter");
    await expect(page.getByText("Preparar presupuesto", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: /^Buscar/ })
      .filter({ visible: true })
      .first()
      .click();
    const input = page.getByLabel("Buscar o crear");
    await input.fill("presu");
    await expect(page.getByRole("option", { name: /Preparar presupuesto/ })).toBeVisible();
    await input.fill("Pagar alquiler mañana");
    await input.press("Enter");
    await expect(page.getByText("Tarea creada: Pagar alquiler")).toBeVisible();
    if (!isMobile) await expectAccessible(page);
  });

  test("workspaces: crear un espacio nuevo y cambiar entre ellos", async ({ page }) => {
    await signUp(page, { name: "Espacios", email: uniqueEmail("ws") });
    await page
      .getByRole("button", { name: /Personal.*cambiar espacio/ })
      .filter({ visible: true })
      .first()
      .click();
    await page.getByRole("button", { name: "Nuevo espacio" }).click();
    await page.getByLabel("Nombre del espacio").fill("Trabajo");
    await page.getByRole("button", { name: "Crear espacio" }).click();
    await expect(page.getByText("Espacio creado")).toBeVisible();
    await expect(
      page
        .getByRole("button", { name: /Trabajo.*cambiar espacio/ })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    // Each workspace has its own tasks
    await page.goto("/tasks");
    await page.getByLabel("Añadir tarea").fill("Tarea de trabajo");
    await page.getByLabel("Añadir tarea").press("Enter");
    await expect(page.getByText("Tarea de trabajo", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: /Trabajo.*cambiar espacio/ })
      .filter({ visible: true })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Personal/ })
      .click();
    await expect(page.getByText("Tarea de trabajo", { exact: true })).toHaveCount(0);
  });
});
