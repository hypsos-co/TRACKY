-- pgTAP: trackers, properties, entries, relation links, views.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-1111-4000-8000-000000000001', 'ana@test.dev', '{}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-1111-4000-8000-000000000002', 'ben@test.dev', '{}', 'authenticated', 'authenticated');
create temporary table w on commit drop as select
  (select id from public.workspaces where created_by = 'aaaaaaaa-1111-4000-8000-000000000001') a,
  (select id from public.workspaces where created_by = 'bbbbbbbb-1111-4000-8000-000000000002') b;
grant select on w to authenticated;

select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.trackers'::regclass,
  'public.tracker_properties'::regclass, 'public.tracker_entries'::regclass,
  'public.tracker_entry_links'::regclass, 'public.tracker_views'::regclass)), 'RLS enabled on tracker tables');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-1111-4000-8000-000000000001","role":"authenticated"}';

select lives_ok($$ insert into public.trackers (id, workspace_id, name) select '10000000-0000-4000-8000-000000000001', a, 'Peso' from w $$, 'member creates a tracker');
select lives_ok($$ insert into public.tracker_properties (id, tracker_id, name, type, is_title) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Fecha', 'date', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Peso', 'decimal', false),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Rutina', 'relation', false) $$, 'member adds properties');
select throws_ok($$ insert into public.tracker_properties (tracker_id, name, type) values ('10000000-0000-4000-8000-000000000001', 'peso', 'integer') $$,
  '23505', null, 'property names are unique per tracker (case-insensitive)');
select lives_ok($$ update public.trackers set date_property_id = '20000000-0000-4000-8000-000000000001' where id = '10000000-0000-4000-8000-000000000001' $$,
  'a date property can be the time axis');
select throws_ok($$ update public.trackers set date_property_id = '20000000-0000-4000-8000-000000000002' where id = '10000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'a non-date property cannot be the time axis');
select lives_ok($$ insert into public.tracker_entries (id, tracker_id, "values") values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '{"20000000-0000-4000-8000-000000000002": 81.5}'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '{}') $$, 'member records entries');
select throws_ok($$ insert into public.tracker_entries (tracker_id, "values") values ('10000000-0000-4000-8000-000000000001', '[]') $$,
  '23514', null, 'entry values must be a JSON object');
select lives_ok($$ insert into public.tracker_entry_links values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002') $$,
  'relation links between entries of the workspace');
select throws_ok($$ insert into public.tracker_entry_links values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002') $$,
  '23514', null, 'links require a relation property');
select lives_ok($$ insert into public.tracker_views (tracker_id, name, type) values ('10000000-0000-4000-8000-000000000001', 'Evolución', 'chart') $$, 'member creates a view');

set local request.jwt.claims = '{"sub":"bbbbbbbb-1111-4000-8000-000000000002","role":"authenticated"}';
select is_empty($$ select 1 from public.trackers $$, 'ben cannot see ana''s trackers');
select is_empty($$ select 1 from public.tracker_entries $$, 'ben cannot see ana''s entries');
select is_empty($$ update public.tracker_entries set "values" = '{}' returning id $$, 'ben cannot edit ana''s entries');
select throws_ok($$ insert into public.tracker_entries (tracker_id) values ('10000000-0000-4000-8000-000000000001') $$, '42501', null,
  'ben cannot add entries to ana''s tracker');
reset role;
set local role anon;
select throws_ok('select * from public.tracker_entries', '42501', null, 'anon has no access');
reset role;

select * from finish();
rollback;
