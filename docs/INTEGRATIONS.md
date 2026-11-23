# TRACKY · Integraciones (diseño — Fase 7)

> Estado: **diseño**. Ninguna integración externa está activa en la Fase 1.

## 1. Principios

- **Consentimiento explícito** por integración y por tipo de dato (especialmente salud).
- Tokens OAuth cifrados en **Supabase Vault**; nunca en el cliente ni en texto plano.
- Toda sincronización pasa por **Edge Functions** o Route Handlers con el usuario autenticado; los datos importados se guardan en tablas con RLS.
- Sincronización periódica (5–15 min) o por webhooks cuando el proveedor los ofrece.
- **Conflictos:** por defecto el usuario elige qué versión conservar (diálogo de resolución). Configurable: prioridad por fuente.
- Cada integración se puede desconectar y sus datos importados se pueden borrar.

## 2. Prioridades

| Servicio                                    | Función                           | Prioridad       | Enfoque                                                                                                                                                                                             |
| ------------------------------------------- | --------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple Health                                | Pasos, peso, sueño, ejercicio     | Alta            | **Fase 5:** importar el export (`export.zip` → XML) o JSON/CSV desde un Atajo de iOS. **Futuro:** app iOS mínima con HealthKit que sincroniza con Supabase (HealthKit no es accesible desde la web) |
| Google Calendar                             | Eventos ⇄ tareas                  | Alta            | OAuth Google, API Calendar v3, `syncToken` incremental + push notifications                                                                                                                         |
| Apple Calendar                              | Eventos ⇄ tareas                  | Alta            | Suscripción iCal (lectura) + CalDAV (escritura)                                                                                                                                                     |
| Google Fit / Health Connect / Strava        | Actividad                         | Media           | OAuth; Strava webhooks                                                                                                                                                                              |
| Google Drive / Dropbox                      | Adjuntos y backups                | Media           | OAuth con scopes mínimos (`drive.file`)                                                                                                                                                             |
| Notion                                      | Importar bases de datos y páginas | Media           | Integración pública OAuth; mapeo de propiedades → trackers                                                                                                                                          |
| Zapier / Make                               | Automatizaciones externas         | Media           | Webhooks salientes firmados (HMAC) + API entrante con tokens personales                                                                                                                             |
| Slack / Teams                               | Notificaciones                    | Baja            | Webhooks entrantes                                                                                                                                                                                  |
| Instagram / Facebook / YouTube / TikTok / X | Métricas de contenido             | Baja            | APIs oficiales; algunas requieren revisión de app por el proveedor                                                                                                                                  |
| Bancos / Stripe                             | Transacciones                     | Baja (opcional) | Importación CSV primero; agregadores (GoCardless/Plaid) si se justifica el coste                                                                                                                    |

## 3. Modelo de datos

`integrations(id, user_id, provider, status, scopes, external_account, last_synced_at, error)` + secreto en Vault referenciado por id. `sync_conflicts(id, user_id, entity, entity_id, local, remote, detected_at, resolved_at, resolution)`.

## 4. Configuración de credenciales (cuando llegue la fase)

Las claves de proveedores se guardan como secretos de Supabase (`supabase secrets set GOOGLE_CLIENT_SECRET=…`) y, si las necesita Next.js en el servidor, en Netlify (sin prefijo `NEXT_PUBLIC_`). Nunca en el repositorio.
