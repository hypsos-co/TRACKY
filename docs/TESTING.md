# TRACKY · Testing y QA

## 1. Pirámide de pruebas

| Nivel                                      | Herramienta                                           | Dónde                      | Comando                              |
| ------------------------------------------ | ----------------------------------------------------- | -------------------------- | ------------------------------------ |
| Unitarias / componentes                    | Vitest + Testing Library (jsdom)                      | `tests/unit/`              | `npm test`                           |
| Base de datos (RLS, triggers, constraints) | pgTAP vía Supabase CLI                                | `supabase/tests/database/` | `npm run test:db`                    |
| E2E + accesibilidad                        | Playwright (Chromium escritorio + Pixel 7) + axe-core | `tests/e2e/`               | `npm run test:e2e`                   |
| Estático                                   | ESLint (next/core-web-vitals) · `tsc` estricto        | —                          | `npm run lint` · `npm run typecheck` |

`npm run check` = lint + typecheck + unit.

## 2. Ejecutar todo en local

```bash
npm run db:start                 # Supabase local (Docker)
npx supabase status -o env       # copia API_URL y PUBLISHABLE_KEY a .env.local
npm run check
npm run test:db
npm run build && npm run test:e2e
```

Los E2E usan un **build de producción** (`next start` en el puerto 3100) contra el **Supabase local real**: no hay mocks de Auth ni de la base de datos. Cada test crea su propio usuario (`e2e-…@example.com`), así que pueden ejecutarse en paralelo.

## 3. Cobertura actual (Fase 1)

### Unitarias (63)

- `routes.test.ts` — rutas públicas/protegidas (default-deny), páginas solo-invitado, **`safeNextPath` contra open redirects** (`//evil`, `https://`, `/\`, `javascript:`, caracteres de control).
- `schemas.test.ts` — validación de login, registro (reglas de contraseña, confirmación, longitud de nombre), recuperación, perfil (zona horaria IANA), lectura de `FormData`.
- `errors-env.test.ts` — mapeo de códigos de Supabase a mensajes sin filtrar existencia de cuentas; configuración de entorno (publishable > anon).
- `components.test.tsx` — `Field` (aria-invalid/aria-describedby), `PasswordField` (toggle accesible), logo (nombres accesibles), `Alert` (roles), `buttonClasses`, iniciales.

### Base de datos — pgTAP (17)

`profiles.test.sql`: RLS activado · trigger crea perfil (con/sin nombre) · `anon` sin acceso · un usuario solo ve/edita su perfil · no puede editar el de otro · no puede insertar ni borrar · no puede tocar `id`/`created_at` · constraints (`display_name` ≤ 80, `avatar_url` https) · aislamiento verificado como superusuario · borrado en cascada.

### E2E (13 escenarios × 2 dispositivos = 26)

- Landing, login y registro: contenido + **axe WCAG 2.1 A/AA sin violaciones serias/críticas**.
- Validación de servidor en registro (mensajes, `aria-invalid`, conserva lo escrito).
- Default-deny: `/dashboard`, `/settings`, `/update-password` y rutas desconocidas → `/login?next=…`.
- Manifest PWA válido e iconos accesibles.
- Flujo completo: registro → dashboard → cerrar sesión → acceso denegado → contraseña errónea (mensaje neutro) → login → rebote desde `/login`.
- `?next=` seguro respetado; externo ignorado.
- Perfil: guardar nombre y zona horaria, persistencia tras recargar, reflejo en el dashboard.
- Validación del perfil (nombre vacío).
- Tema claro/oscuro: aplicación instantánea, persistencia, `aria-checked`.

## 4. Checklist E2E del producto (acumulativo)

- [x] Registrarse e iniciar sesión
- [x] Cerrar sesión y no poder volver a páginas privadas
- [ ] Crear / editar / eliminar una tarea y verla en el dashboard (Fase 2)
- [ ] Crear un tracker, añadir un dato y ver la gráfica actualizada (Fase 3)
- [ ] Completar un objetivo y ver el progreso actualizado (Fase 4)
- [ ] Sincronizar un evento de Google Calendar (Fase 7)
- [ ] Crear una entrada offline y verla sincronizada al reconectar (Fase 8)
- [ ] Pedir una acción al asistente de IA y confirmarla (Fase 6)

## 5. Reglas

- Ninguna fase se da por cerrada con tests en rojo. No se desactivan ni se marcan como `skip` tests para conseguir verde.
- Cada tabla nueva llega con su archivo pgTAP (aislamiento entre dos usuarios + `anon`).
- Cada flujo crítico nuevo llega con su E2E y su `expectAccessible(page)`.
- Selectores E2E por **rol y nombre accesible** (no por clases). Ojo: con Cache Components, Next mantiene páginas anteriores ocultas en el DOM; usa `getByRole` (ignora lo oculto) o acota con `page.getByRole("main")`.
- Rendimiento y Lighthouse: auditoría en Fase 9 (objetivo ≥ 90).
