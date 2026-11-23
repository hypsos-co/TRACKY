# TRACKY · Notificaciones (diseño — Fase 7)

Estado: **diseño**, nada implementado todavía.

## Canales

| Canal    | Tecnología                                        | Limitaciones                                                                                                                            |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Interno  | Tabla `notifications` + Realtime                  | —                                                                                                                                       |
| Web Push | Service Worker + VAPID (`web-push` desde backend) | iOS/iPadOS ≥ 16.4 **solo** si la PWA está instalada en la pantalla de inicio; Safari macOS ≥ 16; cada navegador exige permiso explícito |
| Email    | SMTP propio (p. ej. Resend)                       | El proveedor integrado de Supabase no sirve para notificaciones                                                                         |

## Modelo

`notifications(id, user_id, workspace_id, category, title, body, url, dedupe_key unique, read_at, created_at)` · `notification_preferences(user_id, category, in_app, push, email, quiet_hours)` · `push_subscriptions(user_id, endpoint unique, keys, user_agent, last_seen_at)`.

## Reglas

- Deduplicación por `dedupe_key`; agrupación por categoría y ventana de tiempo.
- Horario de silencio y modo concentración respetados en backend antes de enviar.
- Reintentos con backoff; suscripciones push con 404/410 se eliminan.
- Envío desde backend (pg_cron / funciones programadas), nunca desde el navegador.
