# TRACKY · Roadmap

Leyenda: ✅ hecho · 🟡 en curso · ⬜ pendiente. La auditoría de partida está en `AUDIT.md`.

| Fase                                      | Alcance                                                                                                                                                   | Criterio de "terminado"                                                         | Estado |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ |
| **0 · Auditoría**                         | Inspección del repo, app, BD local y producción; clasificación conservar/mejorar/reconstruir/añadir/eliminar                                              | `AUDIT.md` publicado                                                            | ✅     |
| **1 · Fundación**                         | Next.js 16 + Supabase, auth completa, rutas protegidas, perfiles con RLS, tokens, PWA manifest, CI, producción                                            | Auth + RLS probados (pgTAP + E2E), desplegado                                   | ✅     |
| **2 · Núcleo**                            | Workspaces, proyectos, tareas (subtareas, estados, prioridades, etiquetas), calendario, dashboard de widgets, ⌘K                                          | CRUD real con RLS por workspace, persistencia tras recargar, E2E de flujos      | 🟡     |
| **3 · Trackers**                          | Constructor, propiedades tipadas, vistas (tabla/lista/calendario/tarjetas/kanban/gráfico), fórmulas seguras, relaciones, analítica, importación CSV/Excel | Tracker creado desde cero y plantilla; gráfica refleja datos; fórmulas probadas | ⬜     |
| **4 · Objetivos y hábitos**               | Objetivos con hitos y subobjetivos, progreso desde trackers/tareas, hábitos con rachas por zona horaria y frecuencia                                      | Progreso y rachas calculados en BD y probados                                   | ⬜     |
| **5 · Módulos**                           | Salud (importación real, sin datos inventados), Contenido (pipeline), Biblioteca (editor, archivos, plantillas)                                           | CRUD + vistas + tests por módulo                                                | ⬜     |
| **6 · IA**                                | Capa agnóstica de proveedor, chat (página, panel, ⌘K), herramientas con confirmación, memoria, límites de uso                                             | Acciones reales con confirmación; tests con proveedor simulado                  | ⬜     |
| **7 · Automatizaciones y notificaciones** | Reglas SI→ENTONCES en backend, cron, historial, reintentos, centro de notificaciones, Web Push, email                                                     | Regla ejecutada en backend con la app cerrada; push donde haya soporte          | ⬜     |
| **8 · Integraciones**                     | Calendarios, Notion, Drive/Dropbox, redes sociales, Apple Health vía importación/puente nativo                                                            | Integración real con OAuth y conflictos resueltos                               | ⬜     |
| **9 · Offline y PWA**                     | Service Worker, IndexedDB, cola de sincronización, conflictos, rendimiento                                                                                | Crear tarea offline y sincronizar al reconectar (E2E)                           | ⬜     |
| **10 · QA y producción**                  | CSP con nonce, MFA en UI, exportación y borrado de cuenta, auditoría, rate limiting, Lighthouse, a11y manual                                              | Checklist de aceptación completa                                                | ⬜     |
| **Marca**                                 | Aplicar la identidad visual definitiva cuando se entregue                                                                                                 | Solo cambian tokens y activos de marca                                          | ⬜     |

## Fase 2 · Núcleo — desglose

- [ ] Modelo de datos: `workspaces`, `workspace_members`, `projects`, `task_statuses`, `tasks` (subtareas), `tags`, `task_tags`, `events`, `dashboards`, `dashboard_widgets` + RLS por membresía + pgTAP
- [ ] Backfill del workspace personal para usuarios existentes (producción tiene 1 usuario real)
- [ ] Shell: selector de workspace, navegación por módulos, paleta ⌘K (buscar + crear), diálogos y toasts
- [ ] Tareas: lista por secciones (Hoy, Próximas, Sin fecha, Hechas), alta rápida, detalle editable, subtareas, prioridades, estados, etiquetas, filtros
- [ ] Proyectos: listado, alta/edición, detalle con tareas y progreso calculado
- [ ] Calendario: vistas día/semana/mes/año, eventos y tareas con fecha, alta/edición, mover bloques
- [ ] Dashboard: widgets con datos reales; añadir, quitar, reordenar (drag & drop), cambiar tamaño; persistidos
- [ ] E2E de cada flujo + `expectAccessible`

## Pendiente del propietario

- [ ] Autorizar migraciones + despliegue de cada fase en producción
- [ ] Cambiar la rama por defecto de GitHub a `main` y protegerla
- [ ] Autorizar el cierre de los PRs antiguos de Dependabot (#1–#7)
- [ ] SMTP propio para emails (antes de abrir el registro)
- [ ] Clave de proveedor de IA (Fase 6)
- [ ] Identidad visual definitiva
