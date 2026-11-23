# TRACKY · Auditoría técnica y funcional (Fase 0)

Fecha: 22/11/2026 · Rama auditada: `claude/zealous-davinci-qepx90` (= `main` + PR #9)

## 1. Qué hay

| Área          | Estado encontrado                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack         | Next.js 16.4 (App Router, Cache Components, Partial Prefetching, `src/proxy.ts`), React 19.3, TypeScript estricto, Tailwind v4, Zod 4, `motion`, `lucide-react`                        |
| Backend       | Supabase: Postgres 17 + RLS, Auth (email/contraseña, confirmación por email), `@supabase/ssr` con cookies HttpOnly                                                                     |
| Producción    | Netlify `tracky-7suj` desde `main` → https://tracky-7suj.netlify.app · Supabase "TRACKY APP" (eu-west-1)                                                                               |
| Datos reales  | **1 usuario confirmado + 1 perfil** en producción → toda migración futura debe ser aditiva y conservar ese usuario                                                                     |
| Rutas         | `/`, `/login`, `/sign-up`, `/sign-up/success`, `/forgot-password`, `/update-password`, `/auth/callback`, `/auth/sign-out`, `/auth/error`, `/dashboard`, `/settings`, manifest e iconos |
| Base de datos | `public.profiles` (1:1 `auth.users`), trigger de alta, RLS owner-only, privilegios por columna                                                                                         |
| Tests         | 64 unitarios ✅ · 17 pgTAP ✅ · 26 E2E (escritorio + móvil, axe WCAG AA) ✅ · CI GitHub ✅                                                                                             |
| Código        | ~2 300 líneas TS/TSX en `src/`, sin duplicación relevante, sin errores de lint/tipos                                                                                                   |

## 2. Clasificación

### CONSERVAR (funciona y es la base correcta)

- Stack Next.js 16 + Supabase: encaja con el producto (SSR, Server Actions, RLS, Auth, Storage, Realtime, pg_cron).
- Flujo de autenticación completo (Server Actions + Zod, callback PKCE/token_hash, logout con recarga completa).
- `src/proxy.ts` con **default-deny** y `safeNextPath` (anti open-redirect).
- Data Access Layer (`src/lib/auth/session.ts`) y patrón de `<Suspense>` para Cache Components.
- Tabla `profiles` y sus políticas RLS (probadas en local y verificadas en producción).
- Arquitectura de **design tokens** semánticos (`globals.css` → `@theme`), primitivas UI (`Button`, `Field`, `Alert`, `Card`…).
- Infraestructura de pruebas (Vitest, Playwright + axe, pgTAP) y CI.

### MEJORAR

| Elemento                            | Problema                                                                                                                | Acción                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Dashboard                           | Una tarjeta informativa estática; no es un centro de control                                                            | Reconstruir como sistema de widgets con datos reales (Fase 2)                                    |
| Navegación                          | Solo "Inicio" y "Ajustes"; sin workspaces ni búsqueda                                                                   | Selector de workspace, módulos reales, paleta de comandos ⌘K                                     |
| Identidad visual                    | Los tokens usan los activos que compartiste (paletas, SF Pro/Inter, logo), pero ahora la marca se declara **pendiente** | Se mantienen como **provisionales**; nada fuera de los tokens; documentado en `DESIGN_SYSTEM.md` |
| Ajustes                             | Faltan exportar datos, borrar cuenta y MFA                                                                              | Fase 10 (seguridad) — MFA TOTP ya habilitado en Supabase                                         |
| Región de funciones (Netlify)       | Funciones en `us-east-2` y base de datos en `eu-west-1`: cada petición cruza el Atlántico                               | Cambiar región requiere plan de pago en Netlify; documentado como mejora de rendimiento          |
| Rama por defecto de GitHub          | Sigue siendo la rama de trabajo, no `main`                                                                              | Requiere al propietario (Settings → Default branch)                                              |
| Dependabot                          | PRs #1–#7 apuntan a la rama de trabajo antigua (la config ya se corrigió a `main`)                                      | Cerrarlos cuando el propietario lo autorice; Dependabot los recreará contra `main`               |
| Email de Auth                       | Proveedor gratuito: solo emails del equipo, 2/hora, sin plantillas                                                      | SMTP propio (p. ej. Resend, gratuito) antes de abrir el registro                                 |
| Protección de contraseñas filtradas | Advisor de Supabase: HaveIBeenPwned desactivado (solo planes de pago)                                                   | Aceptado en plan gratuito; documentado en `SECURITY.md`                                          |

### RECONSTRUIR

- **Contenido del dashboard** (tarjeta fija → widgets persistidos por usuario/workspace).

### AÑADIR

Workspaces y membresías · Proyectos · Tareas (subtareas, estados, prioridades, etiquetas, fechas) · Calendario (día/semana/mes/año, eventos, time-blocking) · Dashboards y widgets · Búsqueda universal · Trackers (constructor, propiedades, vistas, fórmulas, relaciones, gráficos, importación) · Objetivos e hitos · Hábitos · Salud · Contenido · Biblioteca · Automatizaciones · IA · Notificaciones · Integraciones · Offline/IndexedDB · Exportación y borrado de cuenta.

### ELIMINAR

Nada perjudicial. No se borra código: `src/lib/supabase/client.ts` (cliente de navegador aún sin uso) se conserva para Realtime/offline.

## 3. Decisiones de arquitectura para la evolución

1. **Workspace-céntrico desde ya.** Toda entidad de usuario lleva `workspace_id`; el acceso se decide con `public.is_workspace_member(workspace_id)` (función `security definer`, estable) en las políticas RLS. Cada usuario tiene un workspace personal (creado por trigger y por _backfill_ para el usuario existente). Esto habilita el SaaS multiusuario sin rehacer tablas.
2. **Relacional primero, JSON solo donde aporta.** Tareas, proyectos, eventos, etiquetas, widgets: columnas tipadas. Para trackers (Fase 3): definiciones de propiedades en tabla propia y valores por registro en `jsonb` indexado por id de propiedad, validados por tipo en servidor (equilibrio entre flexibilidad tipo Notion y consultas eficientes).
3. **Estados de tarea configurables** por workspace (tabla `task_statuses` con categoría `todo|in_progress|done|canceled`) en lugar de un enum fijo.
4. **Fechas:** tareas con `due_date` (día del calendario del usuario, sin ambigüedad de zona horaria) + `due_time` opcional; eventos con `timestamptz` y `all_day`. "Hoy" se calcula con la zona horaria del perfil.
5. **Orden manual** con `position` (float) para reordenar sin reescribir filas.
6. **Widgets:** `dashboard_widgets(type, size, position, config jsonb)` con `config` validada por un esquema Zod por tipo; cada tipo lee datos reales del módulo correspondiente.
7. **Automatizaciones en backend** (Fase 7): `pg_cron` + Edge Functions o funciones programadas de Netlify; idempotencia por `run_key`.
8. **IA agnóstica de proveedor** (Fase 6), herramientas = las mismas Server Actions con Zod, confirmación para acciones destructivas.

## 4. Dependencias y bloqueos

| Necesidad                                       | Para                            | Bloquea                  | Estado                                          |
| ----------------------------------------------- | ------------------------------- | ------------------------ | ----------------------------------------------- |
| Autorización para migrar producción + desplegar | Publicar cada fase              | Solo la publicación      | Se pedirá al cerrar cada fase                   |
| Clave de un proveedor de IA                     | Asistente (Fase 6)              | Fase 6 en producción     | Pendiente; se desarrolla con proveedor simulado |
| SMTP (Resend u otro)                            | Emails de Auth y notificaciones | Email fuera del equipo   | Pendiente                                       |
| Claves VAPID (Web Push)                         | Push (Fase 7)                   | —                        | Se generan sin coste en su fase                 |
| OAuth (Google, Notion, Meta, TikTok…)           | Integraciones (Fase 8)          | Cada integración         | Pendiente, por integración                      |
| Identidad visual definitiva                     | Fase de marca                   | Nada (tokens preparados) | Pendiente de entrega                            |

## 5. Plan inmediato

Fase 1 (fundación) está completa salvo los puntos de "Mejorar". Se continúa con la **Fase 2 · Núcleo**: modelo de datos de workspaces/proyectos/tareas/eventos/dashboards con RLS y pgTAP → shell con workspace, navegación y ⌘K → tareas y proyectos → calendario → dashboard de widgets. Ver `ROADMAP.md`.
