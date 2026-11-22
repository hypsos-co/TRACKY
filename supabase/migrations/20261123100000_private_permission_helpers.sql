-- Move the RLS permission helpers out of the API-exposed `public` schema so they
-- cannot be called as RPCs (Supabase advisor: authenticated_security_definer_function_executable).
-- Policies reference functions by OID, so they keep working after SET SCHEMA.
--
-- down: alter function private.<fn>(uuid) set schema public; drop schema private;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_workspace_member(uuid) set schema private;
alter function public.can_edit_workspace(uuid) set schema private;
alter function public.is_workspace_admin(uuid) set schema private;
