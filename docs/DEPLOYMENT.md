# TRACKY · Despliegue

| Pieza                | Servicio                                                             | Detalle                                                                                                              |
| -------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Web                  | Netlify `tracky-7suj` (plan Free)                                    | https://tracky-7suj.netlify.app · rama de producción `main` · deploy preview por PR (protegido con login de Netlify) |
| Base de datos y Auth | Supabase "TRACKY APP" (`rvllatnbyujiafercdwe`, eu-west-1, plan Free) | Migraciones registradas en `supabase_migrations.schema_migrations`                                                   |
| CI                   | GitHub Actions                                                       | `ci.yml` en PRs y en `main`                                                                                          |

## Orden de una publicación

1. PR con código + migraciones + tests en verde (CI).
2. **Autorización del propietario.**
3. Aplicar migraciones pendientes en producción (aditivas; las que transforman datos se revisan aparte) — workflow `db-migrate.yml` o API de gestión desde el entorno cloud "TRACKY".
4. Merge a `main` → Netlify publica automáticamente.
5. Prueba de humo en producción (portada, login, rutas protegidas, flujo nuevo).

Las migraciones van **antes** del merge: el código nuevo espera las tablas nuevas.

## Variables (Netlify)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (todos los contextos), `NEXT_PUBLIC_SITE_URL` (producción). Tras cambiarlas hay que redesplegar.

## Rollback

- Web: en Netlify, "Publish deploy" sobre el deploy anterior.
- Base de datos: cada migración documenta su reversión en un comentario `-- down:`; Supabase Free no tiene PITR → exportar antes de migraciones arriesgadas.
