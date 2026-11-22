# TRACKY · Arquitectura

## 1. Visión general

```
 Navegador (PWA)                       Netlify (Next.js 16)                     Supabase
 ─────────────────                     ───────────────────                     ────────
 React 19 · Tailwind v4   ──HTTPS──▶   src/proxy.ts  (refresca sesión,         Auth (GoTrue)
 Client Components                     guardas optimistas de rutas)            PostgreSQL + RLS
 (formularios, tema,                   Server Components (DAL)  ──supabase-js─▶ PostgREST (Data API)
  navegación animada)                  Server Actions / Route Handlers         Storage · Realtime ·
                                                                               Edge Functions (fases
                                                                               posteriores)
```

| Capa       | Tecnología                                                                  | Versión            |
| ---------- | --------------------------------------------------------------------------- | ------------------ |
| Framework  | Next.js (App Router, Turbopack, **Cache Components**, Partial Prefetching)  | 16.4               |
| UI         | React · TypeScript estricto · Tailwind CSS v4 · `motion` · `lucide-react`   | 19.3 · 5 · 4.3     |
| Validación | Zod                                                                         | 4                  |
| Backend    | Supabase (`@supabase/ssr`, `@supabase/supabase-js`, CLI como devDependency) | 0.12 · 2.119 · 3.2 |
| Tests      | Vitest + Testing Library · Playwright + axe-core · pgTAP                    | 5 · 1.63 · —       |
| Hosting    | Netlify (frontend, `@netlify/plugin-nextjs`) · Supabase Cloud (backend)     | —                  |

> **Next.js 16 no es el Next.js de los tutoriales.** `middleware.ts` ahora se llama `proxy.ts`; con Cache Components las lecturas de cookies deben ir dentro de `<Suspense>`; las páginas visitadas se conservan ocultas con `<Activity>`. La documentación exacta de la versión instalada está en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## 2. Estructura del repositorio

```
src/
  app/
    layout.tsx               raíz: metadata, viewport, script de tema
    page.tsx                 landing pública
    manifest.ts, icon.svg, apple-icon.png   PWA
    (auth)/                  login, sign-up, sign-up/success, forgot-password, update-password
    (app)/                   shell autenticado: dashboard (widgets), tasks, projects, calendar, settings
    auth/callback/route.ts   enlaces de email (PKCE ?code= y ?token_hash=) y OAuth futuro
    auth/sign-out/route.ts   POST → cierra sesión + recarga completa
    auth/error/page.tsx      enlace caducado / inválido
  components/
    brand/  ui/  auth/  app/  settings/  theme/
  lib/
    env.ts                   configuración pública de Supabase
    routes.ts                reglas de acceso (default-deny) + safeNextPath()
    supabase/{client,server,proxy}.ts, database.types.ts (generado)
    auth/{actions,session,schemas,errors,form-state}.ts
    workspace.ts, workspace-actions.ts   workspace actual (cookie validada contra membresía) + cambio/creación
    tasks/ projects/ calendar/ dashboard/ {data.ts lecturas, actions.ts Server Actions con Zod}
    dates.ts                 días ISO sin desfase + zonas horarias (Intl, DST)
    search.ts                búsqueda universal (⌘K)
  proxy.ts                   Next.js Proxy (antes "middleware")
supabase/
  config.toml                stack local (auth, MFA TOTP, políticas de contraseña)
  migrations/                SQL versionado
  tests/database/*.test.sql  pgTAP (RLS, triggers, constraints)
tests/unit, tests/e2e        Vitest · Playwright
scripts/brand/               generador de trazados del logo
docs/                        esta documentación
```

## 3. Autenticación y autorización (defensa en profundidad)

1. **Proxy (`src/proxy.ts`)** — en cada petición refresca el token de Supabase (cookies `sb-*`, `HttpOnly` gestionadas por `@supabase/ssr`) y aplica guardas **optimistas**: rutas no públicas → `/login?next=…`; usuarios con sesión en `/login|/sign-up|/forgot-password` → `/dashboard`. **Default-deny**: cualquier ruta nueva queda protegida salvo que se añada a `PUBLIC_*` en `src/lib/routes.ts`.
2. **Data Access Layer (`src/lib/auth/session.ts`)** — `getUser()` valida el JWT con `supabase.auth.getClaims()`, deduplicado por petición con `React.cache`. `requireUser()` redirige si no hay sesión. Llama a `connection()` para que nada dependiente de la sesión se prerenderice.
3. **Server Actions (`src/lib/auth/actions.ts`)** — validan la entrada con Zod en el servidor y re-verifican la sesión; nunca confían en el cliente.
4. **Postgres RLS** — la frontera real. Cada tabla con datos de usuario tiene RLS y políticas `(select auth.uid()) = user_id`. Ver `DATABASE.md`.

Flujos:

| Flujo                | Implementación                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro             | `signUp` (action) → si la confirmación de email está desactivada (local) hay sesión → `/dashboard`; si no → `/sign-up/success`. Enlace de email → `/auth/callback?code=…`               |
| Login                | `signIn` (action) → `/dashboard` o el `?next=` saneado (`safeNextPath`, anti open-redirect)                                                                                             |
| Logout               | `<form method="post" action="/auth/sign-out">` → Route Handler → **303 + recarga completa** (para que ninguna página autenticada quede viva en `<Activity>`). Comprueba `Origin` (CSRF) |
| Recuperar contraseña | `requestPasswordReset` → email → `/auth/callback?next=/update-password` → `updatePassword`                                                                                              |
| Errores              | Códigos de Supabase → mensajes en español que no revelan si una cuenta existe (`errors.ts`)                                                                                             |

**Plantillas de email en producción (recomendado):** para que los enlaces funcionen aunque se abran en otro dispositivo, en Supabase → Auth → Email Templates usa
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard` (confirmación) y
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/update-password` (recuperación).

## 4. Renderizado y caché

- Shell estático (layout, navegación, cabeceras) → HTML instantáneo.
- Todo lo que depende del usuario (saludo, perfil, formularios con datos) va en `<Suspense>` con esqueletos y se transmite en streaming (◐ _Partial Prerender_ en `next build`).
- Mutaciones → `revalidatePath("/", "layout")`. Más adelante: `use cache` + `cacheTag(user:<id>)` para datos derivados de la sesión (ver guía oficial _authentication-with-cache-components_).

## 5. Seguridad

- TLS extremo a extremo (Netlify y Supabase). Cabeceras: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (`next.config.ts`). CSP con nonce → Fase 9.
- Solo la clave **publishable** (`sb_publishable_…`) llega al navegador. Las claves secretas nunca llevan prefijo `NEXT_PUBLIC_`.
- Contraseñas: mínimo 8, letras + dígitos (servidor de Auth y Zod coinciden). MFA TOTP habilitado en `config.toml` (UI en Fase 1b/9).
- Dependabot semanal (npm + Actions).

## 6. Entornos y despliegue

| Entorno    | Frontend                                                                  | Backend                                                       |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Local      | `npm run dev`                                                             | `npm run db:start` (Docker)                                   |
| CI         | build de producción                                                       | Supabase local dentro del runner                              |
| Previews   | Netlify: un deploy preview por PR (protegido con login de Netlify)        | Proyecto Supabase Cloud (el de producción)                    |
| Producción | **Netlify** `tracky-7suj` → https://tracky-7suj.netlify.app (rama `main`) | **Supabase** "TRACKY APP" (`rvllatnbyujiafercdwe`, eu-west-1) |

### Estado actual de producción

- **Netlify** (equipo "Júlio César Gonçalves's team", plan Free): repo `hypsos-co/TRACKY` enlazado; rama de producción `main` (solo `main` genera deploys de rama); runtime `@netlify/plugin-nextjs` v5; protección de visitantes solo en deploys que no son de producción.
- **Supabase** (organización "Tracky", plan Free): migración `20261122190000_init_profiles` aplicada y registrada en `supabase_migrations.schema_migrations`.
  Auth: _Site URL_ `https://tracky-7suj.netlify.app`; _Redirect URLs_ `https://tracky-7suj.netlify.app/auth/callback`, `https://*--tracky-7suj.netlify.app/auth/callback`, `http://localhost:3000/auth/callback`; contraseña ≥ 8 con letras y dígitos; **confirmación de email activada**.
- **Limitación del email en el plan gratuito:** el proveedor de email integrado de Supabase solo envía a los miembros del equipo del proyecto (hoy `hypsos.co@gmail.com`), máximo 2 por hora, y no permite editar plantillas. Por eso los enlaces de confirmación/recuperación usan el flujo PKCE (`?code=`) y **deben abrirse en el mismo navegador** donde se pidieron. Antes de abrir TRACKY a otras personas: configurar SMTP propio (p. ej. Resend, gratis hasta 3 000 emails/mes) y las plantillas `token_hash` de §3.

### Variables de entorno

| Variable                                                               | Dónde                                       | Secreta          |
| ---------------------------------------------------------------------- | ------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                             | `.env.local`, Netlify (todos los contextos) | No               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `…_ANON_KEY`)                | `.env.local`, Netlify (todos los contextos) | No (RLS protege) |
| `NEXT_PUBLIC_SITE_URL`                                                 | Netlify (solo producción)                   | No               |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` | GitHub Secrets (workflow de migraciones)    | **Sí**           |

Las variables `NEXT_PUBLIC_*` se incrustan al compilar: tras cambiarlas hay que volver a desplegar.

### Aplicar migraciones a producción

Cualquiera de estas dos vías, **siempre con confirmación explícita del propietario**:

1. Workflow manual **Deploy database migrations** (`db-migrate.yml`, escribe `migrate`), con los secretos de GitHub de la tabla.
2. Desde una sesión de Claude Code en el entorno cloud "TRACKY", que guarda los tokens de Supabase (`api.supabase.com`) y Netlify (`api.netlify.com`) como _network secrets_: `POST /v1/projects/rvllatnbyujiafercdwe/database/query` con el SQL de la migración + registro en `supabase_migrations.schema_migrations`.

### CI (`.github/workflows/ci.yml`)

| Job        | Pasos                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `quality`  | `npm ci` → lint → typecheck → unit → build (sin secretos)                                                          |
| `supabase` | `supabase start` → `test:db` (pgTAP) → `db lint` → build con el stack local → Playwright (escritorio + móvil, axe) |

Las migraciones a producción **no** se aplican automáticamente: requieren lanzar `db-migrate.yml` a mano (acción irreversible = confirmación explícita).

### Backups

Supabase Free no incluye PITR ni backups descargables automáticos. Fase 9: workflow programado `pg_dump` cifrado a almacenamiento externo (Drive/S3), o plan Pro si el presupuesto lo permite.
