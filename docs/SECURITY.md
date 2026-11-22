# TRACKY · Seguridad y privacidad

## Controles implementados

| Control       | Implementación                                                                                              | Verificación                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Autenticación | Supabase Auth (email + contraseña, confirmación de email), sesiones en cookies HttpOnly vía `@supabase/ssr` | E2E `auth.spec.ts`                                      |
| Contraseñas   | ≥ 8 caracteres, letras + dígitos (servidor de Auth y Zod)                                                   | Unit `schemas.test.ts`                                  |
| Autorización  | **RLS en todas las tablas**; acceso por propietario o por membresía de workspace (`is_workspace_member`)    | pgTAP `supabase/tests/database/*` (dos usuarios + anon) |
| Rutas         | Proxy default-deny + re-verificación en cada Server Action / Route Handler (DAL)                            | Unit `routes.test.ts`, E2E                              |
| Open redirect | `safeNextPath` solo acepta rutas relativas del mismo origen                                                 | Unit                                                    |
| CSRF          | Server Actions de Next (comprobación de origen); `/auth/sign-out` comprueba `Origin`                        | —                                                       |
| XSS           | React escapa por defecto; sin `dangerouslySetInnerHTML` salvo el script de tema (estático)                  | Revisión                                                |
| Cabeceras     | HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`                           | Verificado en producción                                |
| Secretos      | Solo la clave _publishable_ llega al navegador; `.env*` ignorado; tokens de servicio como _network secrets_ | —                                                       |
| Validación    | Zod en servidor + `check` constraints en Postgres                                                           | Unit + pgTAP                                            |

## Pendiente (Fase 10)

- CSP con nonce por petición.
- MFA TOTP en la interfaz (ya habilitado en Supabase).
- Exportación de todos los datos (JSON/CSV) y borrado de cuenta (Edge Function con service role).
- Rate limiting de acciones sensibles (Supabase limita Auth; acciones propias: tabla de contadores o Upstash si cabe en el presupuesto).
- Registro de auditoría (`audit_log`).
- Protección de contraseñas filtradas (HaveIBeenPwned): solo disponible en planes de pago de Supabase — aceptado mientras el plan sea gratuito.

## Reglas

- Nunca pedir ni pegar claves en el chat; usar formularios seguros / variables de entorno.
- Cambios en producción (migraciones, variables, Auth) solo con autorización explícita del propietario.
- Datos de salud: solo los que el usuario registra o importa; nunca estimaciones presentadas como mediciones.
