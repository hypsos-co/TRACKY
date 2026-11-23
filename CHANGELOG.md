# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

## [Sin publicar]

### Añadido

- **Fase 2 · Núcleo:** workspaces (personal + adicionales), proyectos con progreso calculado, tareas con subtareas, estados, prioridades, etiquetas y alta en lenguaje natural, calendario (día/semana/mes/año, arrastrar eventos), dashboard de widgets con datos reales (añadir, quitar, tamaño, reordenar), búsqueda universal ⌘K.
- Componentes: Dialog/Sheet nativos, toasts accesibles, Select, Textarea, estados vacíos y esqueletos.
- Auditoría técnica (`docs/AUDIT.md`), roadmap por fases 0–10, `SECURITY.md`, `DEPLOYMENT.md`, `NOTIFICATIONS.md`.
- Mensaje claro cuando el proveedor de email rechaza una dirección no autorizada.

### Corregido

- Accesibilidad (WCAG 2.5.3, 1.4.3, 4.1.2) detectada por axe en el nuevo shell: nombres accesibles, filas de tarea sin controles anidados, contraste de etiquetas; widgets del dashboard que no se refrescaban tras crear una tarea.

## [0.1.0] — 2026-11-22

### Añadido

- Fase 1 · Fundación: Next.js 16 + Supabase, autenticación completa, rutas protegidas, perfil con RLS, design system con tokens, PWA manifest, CI, documentación.
- Producción en Netlify + Supabase Cloud.
