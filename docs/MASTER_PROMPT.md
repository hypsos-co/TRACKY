# TRACKY · Master Prompt para Claude Code

> Prompt maestro original del propietario, adaptado a lo decidido en la Fase 1.
> Cambios respecto al original: nombre **TRACKY**; Next.js 16 (`proxy.ts` en lugar de middleware,
> Cache Components); clave **publishable** de Supabase; identidad visual **ya definida**
> (`DESIGN_SYSTEM.md`); Fase 1 marcada como completada. Las reglas permanentes están en `/CLAUDE.md`.

```
Eres un asistente de desarrollo experto. Estás construyendo TRACKY (Personal OS) paso a paso.
Antes de cada fase lee: docs/PRD.md, docs/ARCHITECTURE.md, docs/DATABASE.md,
docs/DESIGN_SYSTEM.md, docs/ROADMAP.md, docs/TESTING.md y CLAUDE.md.

1. Fase 1 — Fundación  ✅ COMPLETADA
   Next.js 16 + Supabase (@supabase/ssr), auth completa con Server Actions, src/proxy.ts
   (refresco de sesión + default-deny), tabla profiles con RLS, design system TRACKY,
   PWA manifest, CI, docs. Pendiente del propietario: proyecto Supabase Cloud + Vercel.

2. Fase 2 — Navegación, Dashboard y núcleo
   - Añade módulos a la navegación SOLO cuando existan (src/components/app/nav-items.ts).
   - Dashboard con widgets reales (tareas del día, trackers recientes), reordenables.
   - Proyectos/espacios (estructura modular). CRUD de tareas y trackers básicos.
   - Búsqueda global (texto completo con Postgres FTS) que filtre tareas, notas, trackers.
   - Móvil y escritorio. E2E: "ir a Dashboard, crear tarea, verla en el widget".

3. Fase 3 — Sistema de Trackers
   - trackers.schema (jsonb) + tracker_entries.values (jsonb), validados con Zod y en BD.
   - Tipos: número, porcentaje, booleano, fecha, texto, selección/etiquetas, relación, fórmula.
   - Vistas: tabla y gráfica (líneas/barras) con los colores del design system.
   - Plantillas (p. ej. "Seguimiento de peso"). Importación CSV → tracker_entries.
   - Tests: crear tracker, añadir registros, la gráfica muestra los datos.

4. Fase 4 — Tareas, Objetivos y Hábitos
   - Tareas: subtareas, prioridad, proyecto, estados, fechas; vista calendario.
   - Hábitos: recurrencia, registro diario, rachas calculadas desde habit_logs.
   - Objetivos: meta numérica ligada a un tracker, progreso automático, hitos.
   - Tests: completar tarea actualiza estadísticas; registrar hábito actualiza racha.

5. Fase 5 — Módulos especializados (uno por PR)
   Salud (importación manual/JSON/CSV/export de Apple Health), Contenido (pipeline +
   calendario editorial), Biblioteca (notas + Storage), Finanzas (ingresos/gastos +
   gráfico por categoría), Aprendizaje, Viajes, Relaciones. Equipos: solo preparar modelo.
   Cada módulo: tablas + RLS + pgTAP + UI + E2E.

6. Fase 6 — IA Asistente (ver docs/AI_SYSTEM.md)
   Chat global con streaming, adaptador de proveedor, herramientas = Server Actions con Zod,
   confirmación antes de escribir, memoria, router de modelos y presupuesto mensual.

7. Fase 7 — Integraciones (ver docs/INTEGRATIONS.md)
   Google Calendar (OAuth, sync incremental), Apple Health (importación), Drive/Dropbox,
   Notion, redes sociales (lectura de métricas). Tokens en Vault. Diálogo de conflictos.

8. Fase 8 — Offline y optimización
   Service Worker (caché de recursos + página offline), IndexedDB, cola de sincronización,
   detección de conflictos, rendimiento. Test: crear tarea offline y sincronizar al volver.

9. Fase 9 — QA y lanzamiento
   CSP con nonce, MFA TOTP en la UI, exportación/borrado de datos, backups, audit_log,
   Lighthouse ≥ 90, axe + revisión manual, OWASP Top 10, docs finales, checklist de aceptación.

Reglas (resumen; detalle en CLAUDE.md):
- Nada de funcionalidades ficticias ni elementos sin backend.
- Nunca expongas claves en el frontend; secretos en Vercel/GitHub/Supabase.
- Confirmación explícita antes de acciones destructivas (borrados, migraciones de datos,
  despliegues de esquema a producción).
- Identidad visual: usa SOLO los tokens de DESIGN_SYSTEM.md; no inventes colores ni fuentes.
- Tests en verde antes de cerrar una fase; actualiza la documentación tras cada fase.
- Commits frecuentes; al cerrar cada fase, abre un PR para revisión con el estado:
  qué se completó, qué queda, qué necesita del propietario (credenciales, decisiones).

Checklist E2E acumulativo: docs/TESTING.md §4.
Comandos esenciales: README.md.
```
