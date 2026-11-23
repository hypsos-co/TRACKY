# TRACKY · Base de datos

PostgreSQL 17 gestionado por Supabase. Identidades en `auth.users` (Supabase Auth); datos de la app en el esquema `public`, **siempre con RLS**.

## 1. Convenciones

- Clave primaria `uuid` (`gen_random_uuid()`) o la del usuario cuando es 1:1.
- Toda tabla de usuario tiene `user_id uuid not null references auth.users(id) on delete cascade` + índice.
- `created_at`/`updated_at timestamptz not null default now()`; `updated_at` mediante el trigger reutilizable `public.set_updated_at()`.
- RLS activado en la misma migración que crea la tabla. Políticas por operación (`select`, `insert`, `update`, `delete`), `to authenticated`, con `(select auth.uid())` (se evalúa una vez por sentencia → más rápido).
- Restricciones `check` para validar en la BD además de en Zod (defensa en profundidad).
- Funciones `security definer` siempre con `set search_path = ''` y `revoke execute … from public, anon, authenticated`.
- Migraciones: `supabase/migrations/<timestamp>_<nombre>.sql`, nunca se editan una vez aplicadas en producción.

## 2. Esquema actual (Fase 1)

### `public.profiles` (1:1 con `auth.users`)

| Columna                    | Tipo          | Restricciones                                  |
| -------------------------- | ------------- | ---------------------------------------------- |
| `id`                       | `uuid` PK     | FK `auth.users(id) on delete cascade`          |
| `display_name`             | `text`        | 1–80 caracteres o `null`                       |
| `avatar_url`               | `text`        | debe empezar por `https://`                    |
| `timezone`                 | `text`        | default `'UTC'` (validada como IANA en la app) |
| `locale`                   | `text`        | default `'es'`, formato `xx` o `xx-YY`         |
| `created_at`, `updated_at` | `timestamptz` | gestionadas                                    |

- **Trigger `on_auth_user_created`** → `public.handle_new_user()` crea el perfil al registrarse (nombre de `raw_user_meta_data.display_name` o parte local del email).
- **RLS:** `select` y `update` solo del propio perfil. Sin políticas de `insert`/`delete`: los crea el trigger y se borran en cascada al eliminar la cuenta.
- **Privilegios de columna:** `authenticated` solo puede actualizar `display_name, avatar_url, timezone, locale`. `anon` no tiene ningún privilegio.

```sql
create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
```

Cobertura: `supabase/tests/database/profiles.test.sql` (17 aserciones pgTAP: trigger, aislamiento entre usuarios, anon sin acceso, columnas gestionadas, constraints, cascada).

### Fase 2 · Núcleo (`20261123090000_core_workspaces_tasks_calendar.sql`)

| Tabla                             | Propósito                                                                                                       | Acceso (RLS)                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `workspaces`                      | Espacios de trabajo; uno personal por usuario (trigger + backfill)                                              | Miembros leen; crear solo no-personales; admins renombran; owner borra no-personales |
| `workspace_members`               | Membresía con rol `owner/admin/member/viewer`                                                                   | Miembros leen (invitaciones: fase de equipos)                                        |
| `projects`                        | Proyectos con estado, prioridad y fechas                                                                        | Miembros leen; `owner/admin/member` escriben                                         |
| `task_statuses`                   | Estados configurables por workspace con categoría `todo/in_progress/done/canceled` (4 por defecto)              | Miembros leen; admins escriben                                                       |
| `tasks`                           | Tareas y subtareas (`parent_id`), prioridad 0–4, `due_date` + `due_time`, `completed_at` gestionado por trigger | Miembros leen; editores escriben                                                     |
| `tags`, `task_tags`               | Etiquetas por workspace (únicas sin mayúsculas)                                                                 | Igual que tareas                                                                     |
| `events`                          | Eventos del calendario (`timestamptz`, `all_day`, `kind event/time_block`)                                      | Igual que tareas                                                                     |
| `dashboards`, `dashboard_widgets` | Panel por usuario; widgets con tipo, tamaño, posición y `config` JSON acotado                                   | Solo el propietario                                                                  |

Integridad: el trigger `tasks_before_write` impide referenciar proyectos, estados o tareas padre de otro workspace y mantiene `completed_at`; `task_tags_same_workspace` hace lo mismo con etiquetas. Las funciones `is_workspace_member`, `can_edit_workspace` e `is_workspace_admin` (security definer, stable) centralizan los permisos.

Cobertura: `supabase/tests/database/core.test.sql` (32 aserciones: seeding, aislamiento entre dos usuarios, rol viewer solo lectura, integridad entre workspaces, anon sin acceso).

### Fase 3 · Trackers (`20261123120000_trackers.sql`)

| Tabla                 | Propósito                                                                                                                         | Acceso (RLS)                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `trackers`            | Nombre, icono, descripción, `template_key`, `date_property_id` (eje temporal), `archived_at`                                      | Miembros leen; `owner/admin/member` escriben  |
| `tracker_properties`  | Propiedad tipada (`tracker_property_type`, 18 tipos), `config` JSON < 8 KB, posición; nombre único sin mayúsculas; un solo título | Vía `private.tracker_role_ok(tracker, write)` |
| `tracker_entries`     | Registro; `values` objeto JSON < 32 KB indexado por id de propiedad                                                               | Igual                                         |
| `tracker_entry_links` | Relaciones entre registros (FK reales); trigger: mismo workspace y propiedad de tipo `relation`                                   | Igual (a través del registro origen)          |
| `tracker_views`       | Vista guardada (`table/list/cards/kanban/calendar/chart`) + `config` JSON < 8 KB                                                  | Igual                                         |

`dashboard_widgets.type` admite además `tracker_chart` y `tracker_latest` (con `config.trackerId`).

Cobertura: `supabase/tests/database/trackers.test.sql` (16 aserciones: altas por miembros, nombres de propiedad únicos sin mayúsculas, solo una fecha puede ser eje temporal, `values` debe ser objeto JSON, los enlaces exigen una propiedad `relation`, aislamiento entre usuarios al leer/editar/añadir, anon sin acceso).

## 3. Modelo planificado (fases siguientes)

| Tabla                                            | Campos esenciales                                                                                         | Fase  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----- |
| `projects`                                       | id, user_id, name, color, archived_at                                                                     | 2     |
| `tasks`                                          | id, user_id, project_id?, parent_id? (subtareas), title, status, priority, due_at, completed_at, position | 2 / 4 |
| `goals`                                          | id, user_id, tracker_id?, property_key, target_value, start_value, direction, due_at, achieved_at         | 4     |
| `goal_milestones`                                | id, goal_id, user_id, value, label, reached_at                                                            | 4     |
| `habits`                                         | id, user_id, name, schedule (rrule/jsonb), archived_at                                                    | 4     |
| `habit_logs`                                     | id, habit_id, user_id, day (date), status                                                                 | 4     |
| `content_items`                                  | id, user_id, title, type, status, publish_at, platform, metrics (jsonb)                                   | 5     |
| `transactions`                                   | id, user_id, kind (income/expense), category, amount (numeric(12,2)), currency, occurred_on               | 5     |
| `notes`                                          | id, user_id, title, body (markdown), embedding (vector)                                                   | 5 / 6 |
| `ai_conversations`, `ai_messages`, `ai_memories` | historial y memoria del asistente                                                                         | 6     |
| `integrations`                                   | id, user_id, provider, status, scopes, last_synced_at (tokens cifrados con Vault)                         | 7     |
| `notifications`                                  | id, user_id, kind, payload, read_at                                                                       | 4+    |
| `audit_log`                                      | id, user_id, action, entity, entity_id, meta, created_at (solo insert)                                    | 6 / 9 |

Notas de diseño:

- **Rachas de hábitos** se calculan desde `habit_logs` (vista o función), no se almacenan como contador mutable.
- **Progreso de objetivos** se deriva de la última entrada del tracker vinculado (vista `goal_progress`).
- **Trackers flexibles** (tipo Notion, ✅ Fase 3): propiedades como filas tipadas en `tracker_properties` y valores en `tracker_entries.values`, validados en la Server Action; la BD acota tamaño y forma (objeto JSON).
- **Equipos** (futuro multiusuario): se añadirá `workspaces` + `workspace_members` y las políticas pasarán a "miembro del workspace"; por eso todas las tablas llevan `user_id` desde ya.

## 4. Flujo de trabajo

```bash
npm run db:start                         # stack local (Docker)
npx supabase migration new add_tasks     # nuevo archivo en supabase/migrations
npm run db:reset                         # re-aplica todas las migraciones desde cero
npm run test:db                          # pgTAP
npx supabase db lint --level warning     # linter de esquema
npm run db:types                         # regenera src/lib/supabase/database.types.ts
```

Producción: workflow manual **Deploy database migrations** (`supabase db push`). Cualquier migración que borre o transforme datos se marca en el PR y requiere confirmación explícita.

## 5. Exportación y borrado (RGPD)

- Borrar la cuenta (`auth.admin.deleteUser`, vía Edge Function con service role) elimina en cascada todos los datos del usuario.
- Exportación JSON/CSV de todas las tablas del usuario: Edge Function `export-my-data` (Fase 9).
