# TRACKY · Arquitectura

## 1. Visión general

```
 Navegador (PWA)                       Vercel (Next.js 16)                     Supabase
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
| Hosting    | Vercel (frontend) · Supabase Cloud (backend)                                | —                  |

> **Next.js 16 no es el Next.js de los tutoriales.** `middleware.ts` ahora se llama `proxy.ts`; con Cache Components las lecturas de cookies deben ir dentro de `<Suspense>`; las páginas visitadas se conservan ocultas con `<Activity>`. La documentación exacta de la versión instalada está en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

## 2. Estructura del repositorio

```
src/
  app/
    layout.tsx               raíz: metadata, viewport, script de tema
    page.tsx                 landing pública
    manifest.ts, icon.svg, apple-icon.png   PWA
    (auth)/                  login, sign-up, sign-up/success, forgot-password, update-password
    (app)/                   shell autenticado (sidebar + tab bar): dashboard, settings
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

- TLS extremo a extremo (Vercel y Supabase). Cabeceras: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (`next.config.ts`). CSP con nonce → Fase 9.
- Solo la clave **publishable** (`sb_publishable_…`) llega al navegador. Las claves secretas nunca llevan prefijo `NEXT_PUBLIC_`.
- Contraseñas: mínimo 8, letras + dígitos (servidor de Auth y Zod coinciden). MFA TOTP habilitado en `config.toml` (UI en Fase 1b/9).
- Dependabot semanal (npm + Actions).

## 6. Entornos y despliegue

| Entorno              | Frontend                                    | Backend                          |
| -------------------- | ------------------------------------------- | -------------------------------- |
| Local                | `npm run dev`                               | `npm run db:start` (Docker)      |
| CI                   | build de producción                         | Supabase local dentro del runner |
| Preview / Producción | Vercel (integración Git: cada PR = preview) | Proyecto Supabase Cloud          |

### Variables de entorno

| Variable                                                               | Dónde                                    | Secreta          |
| ---------------------------------------------------------------------- | ---------------------------------------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                             | `.env.local`, Vercel                     | No               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `…_ANON_KEY`)                | `.env.local`, Vercel                     | No (RLS protege) |
| `NEXT_PUBLIC_SITE_URL`                                                 | Vercel (producción)                      | No               |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` | GitHub Secrets (workflow de migraciones) | **Sí**           |

### Puesta en producción (una vez)

1. Crear proyecto en Supabase (plan gratuito). Auth → URL Configuration: _Site URL_ = dominio de producción; _Redirect URLs_ = `https://<dominio>/auth/callback` y `https://*-<equipo>.vercel.app/auth/callback` para previews.
2. Importar el repo en Vercel; añadir las variables públicas de la tabla.
3. GitHub → Settings → Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`
   (`gh secret set SUPABASE_ACCESS_TOKEN` …).
4. Ejecutar el workflow **Deploy database migrations** (manual, escribe `migrate` para confirmar).

### CI (`.github/workflows/ci.yml`)

| Job        | Pasos                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `quality`  | `npm ci` → lint → typecheck → unit → build (sin secretos)                                                          |
| `supabase` | `supabase start` → `test:db` (pgTAP) → `db lint` → build con el stack local → Playwright (escritorio + móvil, axe) |

Las migraciones a producción **no** se aplican automáticamente: requieren lanzar `db-migrate.yml` a mano (acción irreversible = confirmación explícita).

### Backups

Supabase Free no incluye PITR ni backups descargables automáticos. Fase 9: workflow programado `pg_dump` cifrado a almacenamiento externo (Drive/S3), o plan Pro si el presupuesto lo permite.
