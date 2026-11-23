-- pgTAP: workspaces, membership-based RLS, integrity triggers, dashboards.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- ── Fixtures ────────────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alice@test.dev', '{}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bob@test.dev', '{}', 'authenticated', 'authenticated');

create temporary table ids on commit drop as
select
  (select id from public.workspaces where created_by = 'aaaaaaaa-0000-4000-8000-000000000001' and is_personal) as ws_a,
  (select id from public.workspaces where created_by = 'bbbbbbbb-0000-4000-8000-000000000002' and is_personal) as ws_b;
grant select on ids to authenticated, anon;

-- ── Signup seeding ──────────────────────────────────────────────────────────
select isnt((select ws_a from ids), null, 'signup creates a personal workspace');
select is((select role::text from public.workspace_members m, ids
            where m.workspace_id = ids.ws_a and m.user_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
          'owner', 'creator is owner of the personal workspace');
select is((select count(*)::int from public.task_statuses s, ids where s.workspace_id = ids.ws_a), 4,
          'workspace gets four default task statuses');
select is((select count(*)::int from public.dashboards where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001' and is_default), 1,
          'signup creates one default dashboard');
select ok((select count(*) from public.dashboard_widgets w join public.dashboards d on d.id = w.dashboard_id
            where d.owner_id = 'aaaaaaaa-0000-4000-8000-000000000001') >= 4, 'default dashboard has widgets');
select is(public.ensure_personal_space('aaaaaaaa-0000-4000-8000-000000000001'), (select ws_a from ids),
          'ensure_personal_space is idempotent');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.workspaces'::regclass, 'public.workspace_members'::regclass, 'public.projects'::regclass,
  'public.task_statuses'::regclass, 'public.tasks'::regclass, 'public.tags'::regclass,
  'public.task_tags'::regclass, 'public.events'::regclass, 'public.dashboards'::regclass,
  'public.dashboard_widgets'::regclass)), 'RLS enabled on every core table');

-- ── Alice works in her workspace ────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok($$ insert into public.projects (id, workspace_id, name)
  select '11111111-0000-4000-8000-0000000000a1', ws_a, 'Web personal' from ids $$, 'member creates a project');
select lives_ok($$ insert into public.tasks (id, workspace_id, project_id, status_id, title, due_date)
  select '22222222-0000-4000-8000-0000000000a1', ws_a, '11111111-0000-4000-8000-0000000000a1',
         (select id from public.task_statuses s where s.workspace_id = ws_a and s.is_default), 'Escribir copy', current_date
  from ids $$, 'member creates a task in a project');
select lives_ok($$ insert into public.tasks (workspace_id, parent_id, status_id, title)
  select ws_a, '22222222-0000-4000-8000-0000000000a1',
         (select id from public.task_statuses s where s.workspace_id = ws_a and s.is_default), 'Subtarea'
  from ids $$, 'member creates a subtask');
select lives_ok($$ update public.tasks set status_id = (select s.id from public.task_statuses s, ids where s.workspace_id = ids.ws_a and s.category = 'done')
  where id = '22222222-0000-4000-8000-0000000000a1' $$, 'member completes a task');
select isnt((select completed_at from public.tasks where id = '22222222-0000-4000-8000-0000000000a1'), null,
            'completing sets completed_at');
select lives_ok($$ update public.tasks set status_id = (select s.id from public.task_statuses s, ids where s.workspace_id = ids.ws_a and s.is_default)
  where id = '22222222-0000-4000-8000-0000000000a1' $$, 'member reopens a task');
select is((select completed_at from public.tasks where id = '22222222-0000-4000-8000-0000000000a1'), null,
          'reopening clears completed_at');
select lives_ok($$ insert into public.tags (id, workspace_id, name) select '33333333-0000-4000-8000-0000000000a1', ws_a, 'Urgente' from ids $$,
                'member creates a tag');
select lives_ok($$ insert into public.task_tags (task_id, tag_id) values ('22222222-0000-4000-8000-0000000000a1', '33333333-0000-4000-8000-0000000000a1') $$,
                'member tags a task');
select lives_ok($$ insert into public.events (workspace_id, title, starts_at, ends_at)
  select ws_a, 'Dentista', now(), now() + interval '1 hour' from ids $$, 'member creates an event');
select throws_ok($$ insert into public.events (workspace_id, title, starts_at, ends_at)
  select ws_a, 'Al revés', now(), now() - interval '1 hour' from ids $$, '23514', null, 'events must end after they start');
select lives_ok($$ insert into public.workspaces (name) values ('Trabajo') $$, 'users can create extra workspaces');
select is((select count(*)::int from public.workspaces), 2, 'alice sees only her two workspaces');
select throws_ok($$ insert into public.workspaces (name, is_personal) values ('Otro personal', true) $$, '42501', null,
                 'users cannot create personal workspaces');

-- ── Bob cannot see or touch Alice's data ────────────────────────────────────
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}';

select is_empty($$ select 1 from public.projects $$, 'bob sees no projects of alice');
select is_empty($$ select 1 from public.tasks $$, 'bob sees no tasks of alice');
select is_empty($$ select 1 from public.events $$, 'bob sees no events of alice');
select is_empty($$ select 1 from public.dashboards where owner_id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
                'bob cannot read alice''s dashboards');
select throws_ok($$ insert into public.tasks (workspace_id, status_id, title)
  select ws_a, (select id from public.task_statuses limit 1), 'intruso' from ids $$, null, null,
  'bob cannot insert into alice''s workspace');
select is_empty($$ update public.tasks set title = 'pwned' where id = '22222222-0000-4000-8000-0000000000a1' returning id $$,
                'bob cannot update alice''s task');
select is_empty($$ delete from public.workspaces returning id $$, 'bob cannot delete alice''s workspaces');

-- Cross-workspace references are rejected even for own data
select throws_ok($$ insert into public.tasks (workspace_id, project_id, status_id, title)
  select ws_b, '11111111-0000-4000-8000-0000000000a1',
         (select id from public.task_statuses s where s.workspace_id = ws_b and s.is_default), 'mezcla'
  from ids $$, null, null, 'a task cannot point to a project in another workspace');

-- ── Viewer role is read-only ────────────────────────────────────────────────
reset role;
insert into public.workspace_members (workspace_id, user_id, role)
  select ws_a, 'bbbbbbbb-0000-4000-8000-000000000002', 'viewer' from ids;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-0000-4000-8000-000000000002","role":"authenticated"}';

select isnt_empty($$ select 1 from public.tasks where id = '22222222-0000-4000-8000-0000000000a1' $$,
                  'a viewer can read the workspace tasks');
select is_empty($$ update public.tasks set title = 'viewer edit' where id = '22222222-0000-4000-8000-0000000000a1' returning id $$,
                'a viewer cannot edit tasks');

-- ── Anonymous ───────────────────────────────────────────────────────────────
reset role;
set local role anon;
select throws_ok('select * from public.tasks', '42501', null, 'anon has no access to tasks');
reset role;

select * from finish();
rollback;
