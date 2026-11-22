-- ─────────────────────────────────────────────────────────────────────────────
-- TRACKY · Phase 1 · Foundation
--   * public.set_updated_at()  — reusable updated_at trigger
--   * public.profiles          — 1:1 with auth.users, owner-only via RLS
--   * public.handle_new_user() — creates the profile when a user signs up
-- Supabase already manages identities in auth.users; app data lives in public.
-- ─────────────────────────────────────────────────────────────────────────────

-- Reusable trigger function: keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: sets NEW.updated_at = now(). Attach BEFORE UPDATE on any table with updated_at.';

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  avatar_url   text check (avatar_url is null or avatar_url ~ '^https://'),
  timezone     text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  locale       text not null default 'es' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user profile. One row per auth.users row, created by trigger. Owner-only access (RLS).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Anonymous visitors get nothing, not even an empty grant surface.
revoke all on table public.profiles from anon;

-- Signed-in users may read and update only their own row. `(select auth.uid())`
-- is evaluated once per statement (initPlan), which keeps policies fast.
create policy "profiles: owner can read"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: owner can update"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No INSERT/DELETE policies: rows are created by the trigger below and removed
-- by the ON DELETE CASCADE when the auth user is deleted (account deletion).

-- Users may only change these columns; id/created_at/updated_at are managed.
revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_url, timezone, locale) on table public.profiles to authenticated;

-- ── New-user hook ───────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(requested_name, split_part(new.email, '@', 1)), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users: creates the matching public.profiles row.';

-- The trigger function must not be callable through the Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
