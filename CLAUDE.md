# TRACKY — instrucciones permanentes para Claude Code

@AGENTS.md

TRACKY es un "Personal OS" (PWA): tareas, trackers, objetivos, hábitos, salud, finanzas, contenido e IA.
Lee `docs/ROADMAP.md` para saber en qué fase estamos y `docs/MASTER_PROMPT.md` para el plan completo.

## Stack (no asumir versiones antiguas)

- **Next.js 16.4** App Router + Turbopack + **Cache Components** + Partial Prefetching. Middleware se llama **`src/proxy.ts`**.
  Antes de usar una API de Next, consulta `node_modules/next/dist/docs/`.
- React 19.3, TypeScript estricto, Tailwind CSS v4 (tokens en `src/app/globals.css`), `motion`, `lucide-react`, Zod 4.
- Supabase vía `@supabase/ssr` (`src/lib/supabase/{client,server,proxy}.ts`), CLI como devDependency (`npx supabase …`).

## Reglas de código

- **Auth:** usa siempre la DAL (`getUser`/`requireUser`/`getProfile` en `src/lib/auth/session.ts`). Cada Server Action valida con Zod **y** re-verifica la sesión. El proxy es solo una guarda optimista.
- **Rutas:** default-deny. Una ruta pública nueva debe añadirse en `src/lib/routes.ts` (y su test).
- **Cache Components:** cualquier lectura de sesión/cookies/searchParams va dentro de `<Suspense>` con un esqueleto. No hagas `await` de la sesión en el nivel superior de un layout.
- **Datos:** toda tabla nueva → migración en `supabase/migrations/` con RLS + políticas por operación con `(select auth.uid())` + archivo pgTAP en `supabase/tests/database/`. Después `npm run db:types`.
- **UI:** solo tokens semánticos (`bg-surface`, `text-fg-muted`, `bg-accent`…); nunca HEX sueltos. Componentes base en `src/components/ui/`. Lima = una sola CTA por pantalla. Ver `docs/DESIGN_SYSTEM.md`.
- **Accesibilidad:** etiqueta visible + error textual en formularios; el nombre accesible contiene el texto visible; E2E con `expectAccessible(page)`.
- **Sin elementos falsos:** la navegación (`src/components/app/nav-items.ts`) solo lista módulos que existen. Ningún botón sin acción real.
- Textos de interfaz en **español**.
- No dupliques lógica: abstrae en `src/lib/` o `src/components/`.

## Seguridad

- Nunca claves secretas con prefijo `NEXT_PUBLIC_` ni en el repo (`.env*` está ignorado salvo `.env.example`).
- Pide confirmación explícita antes de: borrar datos, migraciones que transformen/borren datos, `supabase db push` a producción, force-push.
- Si necesitas credenciales (Supabase Cloud, OAuth, IA), pídelas al propietario; documenta dónde se configuran (`gh secret set …`, variables de Netlify).

## Antes de dar algo por terminado

```bash
npm run check            # lint + typecheck + unit
npm run test:db          # requiere npm run db:start
npm run build && npm run test:e2e
```

Ningún test se salta ni se desactiva para conseguir verde. Actualiza `docs/` (PRD, TESTING, ROADMAP y el doc del área) en el mismo PR.

## Producción

- Web: Netlify `tracky-7suj` (rama `main`). Base de datos: Supabase "TRACKY APP" (`rvllatnbyujiafercdwe`). Detalle en `docs/ARCHITECTURE.md` §6.
- En el entorno cloud "TRACKY" hay tokens guardados para `api.supabase.com` y `api.netlify.com` (los inyecta el proxy; nunca los imprimas ni los pidas en el chat).
- Cualquier cambio en producción (migraciones, variables, ajustes de Auth) requiere confirmación explícita del propietario.

## Entorno sin Docker Hub/ECR

Si `supabase start` falla al descargar imágenes de `public.ecr.aws`, usa `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start`.
