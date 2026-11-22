# TRACKY · Roadmap

Leyenda: ✅ hecho · 🟡 en curso · ⬜ pendiente

| Fase                       | Alcance                                                                                                                                                  | Entregables                                                   | Criterios de aceptación                                            | Estado |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| **1 · Fundación**          | Next.js 16 + Supabase, Auth (registro/login/logout/recuperación), rutas protegidas, perfil con RLS, design system con identidad TRACKY, PWA manifest, CI | App funcional local, migración `profiles`, docs, CI           | Auth + RLS probados (pgTAP + E2E), build sin secretos, tests pasan | ✅     |
| **2 · Núcleo**             | Dashboard con widgets, proyectos/espacios, CRUD de tareas y trackers básicos, búsqueda global                                                            | Tablas `projects`, `tasks`, `trackers`, `tracker_entries`; UI | CRUD real con RLS, E2E de crear/editar/borrar                      | ⬜     |
| **3 · Trackers avanzados** | Propiedades múltiples y fórmulas, vistas tabla/gráfica, plantillas, importación CSV                                                                      | Motor de propiedades, gráficas, importador                    | Gráfica refleja los datos guardados; tests de fórmulas             | ⬜     |
| **4 · Productividad**      | Objetivos con hitos y progreso automático, hábitos con rachas, rutinas, calendario, notificaciones básicas                                               | `goals`, `habits`, `habit_logs`, vistas de progreso           | Progreso y rachas calculados en BD y probados                      | ⬜     |
| **5 · Módulos**            | Salud (importación), Contenido, Biblioteca, Finanzas, Aprendizaje, Viajes, Relaciones                                                                    | Un módulo por PR, cada uno con tablas + RLS + UI              | CRUD persistente y tests por módulo                                | ⬜     |
| **6 · IA**                 | Chat global, memoria, herramientas (crear tarea/tracker) con confirmación, resúmenes, búsqueda semántica                                                 | `AI_SYSTEM.md` implementado                                   | Acciones piden confirmación; tests con proveedor simulado          | ⬜     |
| **7 · Integraciones**      | Google Calendar, importación Apple Health, Drive/Dropbox, Notion, redes sociales                                                                         | Conectores OAuth con tokens en Vault                          | Sync de calendario funcionando; resolución de conflictos           | ⬜     |
| **8 · Offline**            | Service Worker, IndexedDB, cola de sync, conflictos; rendimiento                                                                                         | SW + almacenamiento local                                     | Crear tarea offline y sincronizar al reconectar (E2E)              | ⬜     |
| **9 · QA y lanzamiento**   | CSP con nonce, MFA UI, exportación/borrado de datos, backups, auditoría, Lighthouse, accesibilidad manual                                                | Checklist final                                               | Todos los tests, OWASP Top 10, a11y manual                         | ⬜     |

> El orden del MASTER_PROMPT original situaba Integraciones (6) antes que IA (7); este roadmap mantiene IA en 6 como en la tabla del PRD original. Cualquiera de los dos órdenes funciona: decide al llegar a la Fase 5.

## Fase 1 · Detalle de lo entregado

- [x] Repositorio Next.js 16.4 (App Router, TS estricto, Tailwind v4, Cache Components)
- [x] Clientes Supabase (navegador, servidor, proxy) con `@supabase/ssr` y clave publishable
- [x] `src/proxy.ts`: refresco de sesión + default-deny de rutas
- [x] Registro, login, logout (recarga completa), recuperar/actualizar contraseña, callback de email (PKCE y token_hash), página de error
- [x] Migración `profiles` + trigger de alta + RLS + privilegios por columna
- [x] Ajustes: perfil (nombre, zona horaria), tema, cambio de contraseña, cerrar sesión
- [x] Design system: paleta fusionada con contrastes AA, SF Pro vía sistema + Inter, logo vectorizado, wordmark Baby Shower en contornos, vidrio líquido, animaciones
- [x] PWA: manifest, iconos (incl. maskable y Apple)
- [x] Tests: 63 unitarios (Vitest), 17 pgTAP, 26 E2E (escritorio + móvil, axe WCAG 2.1 AA)
- [x] CI (GitHub Actions), workflow manual de migraciones, Dependabot, cabeceras de seguridad
- [x] Documentación completa en `docs/`

### Puesta en producción

- [x] Supabase Cloud "TRACKY APP": migración aplicada, Auth configurado (URLs, reglas de contraseña, confirmación de email)
- [x] Publicada en Netlify desde `main`: https://tracky-7suj.netlify.app (previews protegidos)
- [ ] Cambiar la rama por defecto de GitHub a `main` y protegerla (propietario)
- [ ] SMTP propio para emails de Auth antes de abrir el registro a otras personas (Fase 9 o antes)
- [ ] Confirmar licencias tipográficas (ver `DESIGN_SYSTEM.md` §3)
