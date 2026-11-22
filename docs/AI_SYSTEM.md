# TRACKY · Sistema de IA (diseño — Fase 6)

> Estado: **diseño**. Nada de esto está implementado todavía; la Fase 6 lo construye.

## 1. Objetivos

Un **asistente transversal** (chat accesible desde cualquier pantalla) y un **motor de automatización** que:

- responde con el contexto real del usuario (tareas, objetivos, trackers, notas);
- propone y ejecuta acciones (crear tarea, registrar un valor, crear un tracker desde una descripción) **con confirmación**;
- genera informes (resumen semanal, análisis de tendencias) y sugerencias (hábitos, automatizaciones);
- busca semánticamente en notas y documentos.

La IA **no** inventa identidad visual: colores, tipografías y logo están fijados en `DESIGN_SYSTEM.md`.

## 2. Arquitectura

```
Chat UI (client) ──▶ Server Action / Route Handler /api/assistant (stream)
                         │  1. requireUser()  (DAL)
                         │  2. presupuesto: ai_usage del mes < límite
                         │  3. router de modelo (simple | complejo)
                         │  4. contexto: resumen del usuario + RAG (pgvector) + memoria
                         ▼
                    Proveedor LLM (adaptador)  ◀── tool calls ──▶  Herramientas tipadas (Zod)
                                                                     · read_*: ejecución directa (RLS)
                                                                     · write_*: devuelven "propuesta"
                                                                       → el usuario confirma en la UI
                                                                       → se ejecuta la Server Action real
```

- **Agnóstico de proveedor:** interfaz `LLMProvider { stream(messages, tools) }` con adaptadores (Anthropic Claude, OpenAI, modelo local vía Ollama/servidor compatible OpenAI). El proveedor y los modelos se configuran por variables de entorno.
- **Herramientas = las mismas Server Actions que usa la UI**, envueltas con esquemas Zod. Así la IA nunca tiene más permisos que el usuario y RLS sigue aplicando.
- **Sin service role** en el camino de la IA: todas las consultas usan el cliente del usuario.

## 3. Permisos y confirmación

| Tipo de acción                 | Ejemplo                               | Política                                                                      |
| ------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| Lectura                        | "¿Cuánto he dormido esta semana?"     | Automática                                                                    |
| Escritura simple               | Crear una tarea, registrar un valor   | Propuesta → **un clic para confirmar** (configurable a "automático" por tipo) |
| Escritura masiva / destructiva | Borrar datos, editar muchos registros | **Siempre** confirmación explícita con resumen de impacto; nunca automática   |
| Externa                        | Enviar email, publicar en redes       | Siempre confirmación                                                          |

Cada ejecución queda en `audit_log` (`actor = 'assistant'`).

## 4. Memoria y contexto

- **Contexto corto:** últimos N mensajes de la conversación.
- **Perfil de contexto:** resumen generado (objetivos activos, hábitos, proyectos) regenerado periódicamente → barato de enviar.
- **Memoria larga:** `ai_memories` (hechos que el usuario acepta guardar) + embeddings en `pgvector` sobre notas/tareas para RAG.
- El usuario puede ver, editar y borrar sus memorias.

## 5. Control de costes (presupuesto 0–10 €/mes)

- **Router de modelos:** tareas simples (clasificar, resumir, extraer, comandos) → modelo pequeño y barato; razonamiento complejo (análisis de tendencias, planificación) → modelo grande, solo si hace falta.
- Límite mensual por usuario (`ai_usage`: tokens y coste estimado) con aviso al 80 % y corte al 100 %.
- Caché de respuestas deterministas (resúmenes semanales se generan una vez).
- Preferir funciones **sin LLM** cuando bastan (estadísticas, rachas, progreso se calculan en SQL).
- Opción de modelo local para usuarios avanzados / modo offline básico.

## 6. Funciones previstas

1. Chat global con streaming.
2. "Crear tracker a partir de una descripción" → propone esquema de propiedades.
3. Resumen semanal (Edge Function programada) → bandeja de notificaciones + email opcional.
4. Sugerencias proactivas ("no registras peso desde hace 3 días, ¿activo un recordatorio?") — siempre como sugerencia editable.
5. Búsqueda semántica en notas ("¿dónde apunté el evento de marzo?").
6. Sugerencia de automatizaciones a partir del uso.

## 7. Pruebas

- Proveedor simulado determinista para tests unitarios/E2E (sin coste ni red).
- Tests de que las herramientas de escritura **no** ejecutan sin confirmación.
- Tests de presupuesto (corte al superar el límite).
- Evaluaciones offline de calidad de respuestas con un conjunto de prompts fijos.
