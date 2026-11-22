# TRACKY · Product Requirements

> Nombre del producto: **TRACKY** (concepto de trabajo: _Personal OS_).
> Estado: Fase 1 (Fundación) completada — ver `ROADMAP.md`.

## 1. Resumen

TRACKY es una **PWA** (móvil + escritorio) que actúa como **centro de control personal**: unifica tareas, objetivos, hábitos, salud, finanzas, creación de contenido y cualquier métrica que el usuario quiera seguir, con un **asistente de IA** transversal.

El usuario puede:

- Ver su **estado general** (salud, productividad, finanzas, objetivos) en un dashboard configurable.
- Crear **trackers** personalizados (propiedades, fórmulas, gráficos) para cualquier métrica.
- Planificar y seguir **objetivos, tareas, hábitos y rutinas** con recordatorios inteligentes.
- Usar **módulos especializados** (Salud, Contenido, Finanzas, Biblioteca, Aprendizaje, Viajes, Relaciones, Equipos) y crear módulos propios.
- Pedir a la **IA** análisis, resúmenes y automatizaciones sobre sus propios datos.

## 2. Público

- **Inicial:** personas individuales exigentes — productivas, creativas, con varios proyectos personales.
- **Futuro:** SaaS multiusuario y espacios de equipo (el modelo de datos ya lo contempla).

## 3. Requisitos funcionales

| Módulo                              | Requisitos clave                                                                                                                                                               | Fase                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| **Cuenta**                          | Registro, login, logout, recuperar contraseña, perfil (nombre, zona horaria), tema claro/oscuro/sistema. MFA TOTP opcional                                                     | **1 ✅** (MFA UI: 9)            |
| **Dashboard**                       | Widgets configurables y reordenables (drag & drop), métricas clave, tareas del día, recordatorios                                                                              | 2                               |
| **Navegación y búsqueda**           | Sidebar (escritorio) / tab bar (móvil); búsqueda global (texto completo; semántica en Fase 6)                                                                                  | 1 ✅ / 2                        |
| **Trackers**                        | Propiedades: número, porcentaje, booleano, fecha, texto, selección/etiquetas, relación, fórmula. Vistas: tabla, lista, gráfica. Plantillas (p. ej. "Peso"). Importar CSV/Excel | 2–3                             |
| **Objetivos**                       | Metas cuantitativas ligadas a un tracker ("llegar a 75 kg"), hitos, progreso automático, fecha objetivo                                                                        | 4                               |
| **Tareas y proyectos**              | Subtareas, prioridad, dependencias, proyectos, estados, fechas límite, integración con calendario                                                                              | 2 / 4                           |
| **Calendario**                      | Vista mes/semana, time-blocking, sync bidireccional Google/Apple                                                                                                               | 4 / 7                           |
| **Hábitos y rutinas**               | Seguimiento diario, rachas, rutinas programadas, detección de incumplimientos                                                                                                  | 4                               |
| **Salud**                           | Importación (JSON/CSV/export de Apple Health), luego HealthKit/Google Fit/Strava. Peso, grasa, pasos, ejercicio, sueño, calorías. Tendencias y alertas                         | 5 / 7                           |
| **Contenido**                       | Ideas, pipeline (escribir → grabar → editar → publicar), calendario editorial, métricas post-publicación                                                                       | 5                               |
| **Biblioteca**                      | Notas Markdown, archivos (Supabase Storage), relaciones con proyectos/trackers                                                                                                 | 5                               |
| **Finanzas**                        | Ingresos/gastos, presupuesto por categoría, flujo de caja, objetivos de ahorro                                                                                                 | 5                               |
| **Aprendizaje, Viajes, Relaciones** | Lecturas/cursos/habilidades; itinerarios y presupuestos; contactos y frecuencia de contacto                                                                                    | 5                               |
| **Equipos**                         | Espacios colaborativos con permisos                                                                                                                                            | futuro (preparado en el modelo) |
| **Módulos personalizados**          | Estructura de datos propia definida por el usuario (sobre el motor de trackers)                                                                                                | 3+                              |
| **IA**                              | Chat global con contexto, acciones con confirmación, resúmenes, sugerencias, autocompletado de trackers, búsqueda semántica                                                    | 6                               |
| **Automatizaciones**                | Reglas "si → entonces", programadas (cron), webhooks, sugeridas por IA                                                                                                         | 4 / 6                           |
| **Notificaciones**                  | Web Push, bandeja interna, email, preferencias y "no molestar"                                                                                                                 | 4 / 8                           |
| **Offline**                         | Service Worker, IndexedDB, cola de sincronización, resolución de conflictos                                                                                                    | 8                               |
| **Privacidad**                      | Exportar todos los datos (JSON/CSV), borrar cuenta, consentimiento por integración                                                                                             | 9                               |

Todos los módulos se pueden **activar/desactivar** y personalizar.

## 4. Requisitos no funcionales

- **Responsive:** móvil vertical y escritorio horizontal sin errores.
- **Accesibilidad:** WCAG 2.1 AA (verificado con axe en E2E y revisión manual).
- **Rendimiento:** shell estático instantáneo; contenido del usuario en streaming; Lighthouse ≥ 90 en Performance/Accessibility/Best Practices.
- **Seguridad:** RLS en todas las tablas, secretos fuera del código, OWASP Top 10 (ver `ARCHITECTURE.md` §5).
- **Coste:** 0–10 €/mes (niveles gratuitos de Netlify y Supabase; IA con presupuesto limitado).
- **Idioma:** español primero; textos centralizables para i18n posterior.

## 5. Criterios de aceptación (todas las fases)

Una funcionalidad está **terminada** solo si:

1. Está completa según esta especificación.
2. Es responsive (móvil y escritorio).
3. Persiste en la base de datos real con RLS (nada hardcodeado en el frontend).
4. Tiene tests automatizados que pasan (unitarios/integración; E2E para flujos críticos; pgTAP para RLS).
5. Valida entradas con mensajes de error claros (cliente y servidor).
6. Está documentada (este PRD, `TESTING.md` y el doc del área afectada).
7. **No contiene elementos de mentira:** ningún botón, enlace o módulo sin funcionalidad real. La navegación solo muestra módulos que existen.

## 6. Fuera de alcance (por ahora)

- Apps nativas (iOS/Android). HealthKit nativo requerirá una app iOS ligera o un atajo de exportación (ver `INTEGRATIONS.md`).
- Facturación / planes de pago.
