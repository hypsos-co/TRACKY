<p align="center">
  <img src="public/brand/logo-mark.svg" width="72" alt="" />
</p>

<h1 align="center">TRACKY.</h1>

<p align="center">Tu sistema operativo personal — hábitos, objetivos, trackers, salud y proyectos en un solo lugar.</p>

---

**Estado:** Fase 1 · Fundación ✅ — autenticación completa, perfil con RLS, design system TRACKY, PWA y CI.
Plan completo en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + RLS, Auth) · Vitest · Playwright + axe · pgTAP · GitHub Actions · Vercel.

## Puesta en marcha local

Requisitos: Node ≥ 22 y Docker.

```bash
npm install
npm run db:start                     # Supabase local (Postgres, Auth, API) en Docker
cp .env.example .env.local
npx supabase status -o env           # copia API_URL → NEXT_PUBLIC_SUPABASE_URL
                                     #       PUBLISHABLE_KEY → NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                          # http://localhost:3000
```

En local la confirmación de email está desactivada: al registrarte entras directamente. Los emails (recuperar contraseña) se ven en Mailpit: http://127.0.0.1:54324.

## Scripts

| Comando                                     | Qué hace                                                            |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                               | Servidor de desarrollo                                              |
| `npm run build` / `npm start`               | Build y servidor de producción                                      |
| `npm run check`                             | Lint + typecheck + formato + tests unitarios                        |
| `npm test`                                  | Tests unitarios (Vitest)                                            |
| `npm run test:db`                           | Tests de base de datos / RLS (pgTAP)                                |
| `npm run test:e2e`                          | E2E + accesibilidad (requiere `npm run build` y Supabase en marcha) |
| `npm run db:start` / `db:stop` / `db:reset` | Ciclo de vida de Supabase local                                     |
| `npm run db:types`                          | Regenera los tipos TypeScript desde el esquema                      |

## Despliegue

1. **Supabase Cloud:** crea el proyecto (plan gratuito) y configura las URLs de redirección (`https://<dominio>/auth/callback`).
2. **Vercel:** importa el repositorio y añade `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_SITE_URL`. Cada PR genera un preview.
3. **Migraciones:** añade los secretos de GitHub y lanza el workflow manual _Deploy database migrations_:
   ```bash
   gh secret set SUPABASE_ACCESS_TOKEN
   gh secret set SUPABASE_DB_PASSWORD
   gh secret set SUPABASE_PROJECT_ID
   ```

Detalles en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#6-entornos-y-despliegue).

## Documentación

| Documento                              | Contenido                                         |
| -------------------------------------- | ------------------------------------------------- |
| [PRD](docs/PRD.md)                     | Requisitos de producto y criterios de aceptación  |
| [ARCHITECTURE](docs/ARCHITECTURE.md)   | Arquitectura, auth, seguridad, CI/CD, despliegue  |
| [DATABASE](docs/DATABASE.md)           | Esquema, RLS, convenciones y modelo planificado   |
| [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) | Paleta, tipografía, logo, componentes, movimiento |
| [AI_SYSTEM](docs/AI_SYSTEM.md)         | Diseño del asistente de IA (Fase 6)               |
| [INTEGRATIONS](docs/INTEGRATIONS.md)   | Integraciones externas (Fase 7)                   |
| [ROADMAP](docs/ROADMAP.md)             | Fases, estado y entregables                       |
| [TESTING](docs/TESTING.md)             | Estrategia de pruebas y cobertura                 |
| [MASTER_PROMPT](docs/MASTER_PROMPT.md) | Prompt maestro para Claude Code                   |
| [CLAUDE.md](CLAUDE.md)                 | Reglas permanentes para Claude Code               |
