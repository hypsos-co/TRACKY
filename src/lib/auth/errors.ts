/**
 * Map Supabase Auth error codes to user-facing Spanish copy.
 * Messages never reveal whether an account exists.
 * Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu email antes de entrar. Revisa tu bandeja de entrada.",
  user_already_exists: "No hemos podido crear la cuenta con ese email.",
  email_exists: "No hemos podido crear la cuenta con ese email.",
  weak_password: "La contraseña es demasiado débil. Combina letras y números (mín. 8).",
  same_password: "La nueva contraseña debe ser distinta de la actual.",
  over_request_rate_limit: "Demasiados intentos. Espera un momento y vuelve a probar.",
  over_email_send_rate_limit:
    "Hemos enviado demasiados emails. Inténtalo de nuevo en unos minutos.",
  email_address_invalid: "Ese email no es válido.",
  signup_disabled: "El registro está desactivado temporalmente.",
  // Supabase's built-in mailer (free tier) only delivers to the project team's addresses.
  email_address_not_authorized:
    "Ahora mismo el registro solo está disponible para emails autorizados. Inténtalo con otro email.",
  session_not_found: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  otp_expired: "El enlace ha caducado. Solicita uno nuevo.",
  flow_state_expired: "El enlace ha caducado. Solicita uno nuevo.",
  bad_code_verifier: "Abre el enlace en el mismo navegador donde lo solicitaste.",
};

const FALLBACK = "Algo ha fallado. Inténtalo de nuevo.";

export function authErrorMessage(
  error: { code?: string | null; status?: number } | null | undefined,
) {
  if (!error) return FALLBACK;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.status === 429) return MESSAGES.over_request_rate_limit;
  return FALLBACK;
}
