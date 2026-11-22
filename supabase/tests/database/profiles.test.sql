-- pgTAP tests for public.profiles: trigger, RLS, column privileges, constraints.
-- Run with: npm run test:db   (wraps `supabase test db`)
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- ── Fixtures (as postgres / superuser) ───────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'alice@test.dev', '{"display_name":"Alice"}', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'bob@test.dev', '{}', 'authenticated', 'authenticated');

-- ── Schema guarantees ───────────────────────────────────────────────────────
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on public.profiles'
);

select is(
  (select display_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'Alice',
  'signup trigger creates a profile using metadata display_name'
);

select is(
  (select display_name from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  'bob',
  'signup trigger falls back to the email local part'
);

select is(
  (select timezone from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  'UTC',
  'timezone defaults to UTC'
);

-- ── Anonymous visitors ──────────────────────────────────────────────────────
set local role anon;
select throws_ok(
  'select * from public.profiles',
  '42501',
  null,
  'anon has no access to profiles at all'
);
reset role;

-- ── Signed in as Alice ──────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select results_eq(
  'select id from public.profiles',
  $$ values ('11111111-1111-4111-8111-111111111111'::uuid) $$,
  'a user can only see their own profile'
);

select lives_ok(
  $$ update public.profiles set display_name = 'Alice Liddell', timezone = 'Europe/Madrid'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  'a user can update their own profile'
);

select is_empty(
  $$ update public.profiles set display_name = 'pwned'
     where id = '22222222-2222-4222-8222-222222222222' returning id $$,
  'a user cannot update someone else''s profile'
);

select is_empty(
  $$ delete from public.profiles where id = '11111111-1111-4111-8111-111111111111' returning id $$,
  'a user cannot delete profiles directly (only via account deletion)'
);

select throws_ok(
  $$ insert into public.profiles (id) values ('33333333-3333-4333-8333-333333333333') $$,
  '42501',
  null,
  'a user cannot insert profiles (the signup trigger does it)'
);

select throws_ok(
  $$ update public.profiles set created_at = now() - interval '1 year'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501',
  null,
  'managed columns (created_at) are not updatable by users'
);

select throws_ok(
  $$ update public.profiles set id = '22222222-2222-4222-8222-222222222222'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501',
  null,
  'a user cannot re-point their profile id'
);

select throws_ok(
  $$ update public.profiles set display_name = repeat('x', 81)
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '23514',
  null,
  'display_name longer than 80 chars is rejected'
);

select throws_ok(
  $$ update public.profiles set avatar_url = 'http://insecure.example/a.png'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '23514',
  null,
  'avatar_url must be https'
);
reset role;

-- ── Back as superuser: verify isolation held ────────────────────────────────
select is(
  (select display_name from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  'bob',
  'Bob''s profile was not modified by Alice'
);

select is(
  (select timezone from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'Europe/Madrid',
  'Alice''s own update persisted'
);

delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select is_empty(
  $$ select 1 from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$,
  'deleting the auth user cascades to the profile'
);

select * from finish();
rollback;
