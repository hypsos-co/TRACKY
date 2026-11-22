-- ─────────────────────────────────────────────────────────────────────────────
-- TRACKY · Phase 2 · Core data model
--   workspaces + members (multi-tenant ready), projects, configurable task
--   statuses, tasks (+subtasks), tags, calendar events, dashboards + widgets.
-- Additive only: no existing table or row is modified. Existing users are
-- backfilled with a personal workspace, default statuses and a dashboard.
--
-- down: drop table public.dashboard_widgets, public.dashboards, public.events,
--       public.task_tags, public.tags, public.tasks, public.task_statuses,
--       public.projects, public.workspace_members, public.workspaces cascade;
--       drop type public.workspace_role, public.project_status,
--       public.task_status_category; drop the functions created below.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.project_status as enum ('planned', 'active', 'paused', 'completed', 'archived');
create type public.task_status_category as enum ('todo', 'in_progress', 'done', 'canceled');

-- ── Workspaces ──────────────────────────────────────────────────────────────
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  icon        text check (icon is null or char_length(icon) <= 16),
  is_personal boolean not null default false,
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.workspace_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- Membership helpers used by every policy. SECURITY DEFINER avoids RLS
-- recursion on workspace_members; STABLE lets Postgres cache per statement.
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_workspace(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.can_edit_workspace(uuid) from public, anon;
revoke execute on function public.is_workspace_admin(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

-- ── Projects ────────────────────────────────────────────────────────────────
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  description  text check (description is null or char_length(description) <= 5000),
  status       public.project_status not null default 'active',
  priority     smallint not null default 0 check (priority between 0 and 4),
  icon         text check (icon is null or char_length(icon) <= 16),
  start_date   date,
  due_date     date,
  position     double precision not null default 0,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (start_date is null or due_date is null or due_date >= start_date)
);
create index projects_workspace_idx on public.projects (workspace_id, status);

-- ── Task statuses (configurable per workspace) ──────────────────────────────
create table public.task_statuses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  category     public.task_status_category not null,
  position     double precision not null default 0,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);
create unique index task_statuses_one_default on public.task_statuses (workspace_id) where is_default;

-- ── Tasks ───────────────────────────────────────────────────────────────────
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete set null,
  parent_id    uuid references public.tasks (id) on delete cascade,
  status_id    uuid not null references public.task_statuses (id) on delete restrict,
  title        text not null check (char_length(btrim(title)) between 1 and 300),
  notes        text check (notes is null or char_length(notes) <= 20000),
  priority     smallint not null default 0 check (priority between 0 and 4),
  start_date   date,
  due_date     date,
  due_time     time,
  completed_at timestamptz,
  position     double precision not null default 0,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (due_time is null or due_date is not null),
  check (parent_id is null or parent_id <> id)
);
create index tasks_workspace_due_idx on public.tasks (workspace_id, due_date);
create index tasks_project_idx on public.tasks (project_id) where project_id is not null;
create index tasks_parent_idx on public.tasks (parent_id) where parent_id is not null;
create index tasks_status_idx on public.tasks (status_id);
create index tasks_title_search_idx on public.tasks using gin (to_tsvector('simple', title));

-- Keep cross-references inside one workspace and maintain completed_at.
create or replace function public.tasks_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare
  cat public.task_status_category;
begin
  select s.category into cat from public.task_statuses s
   where s.id = new.status_id and s.workspace_id = new.workspace_id;
  if cat is null then
    raise exception 'status % does not belong to workspace %', new.status_id, new.workspace_id
      using errcode = '23514';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.workspace_id = new.workspace_id
  ) then
    raise exception 'project does not belong to the task workspace' using errcode = '23514';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.tasks t where t.id = new.parent_id and t.workspace_id = new.workspace_id
  ) then
    raise exception 'parent task does not belong to the task workspace' using errcode = '23514';
  end if;

  if cat = 'done' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_before_write
  before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- ── Tags ────────────────────────────────────────────────────────────────────
create table public.tags (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 40),
  created_at   timestamptz not null default now()
);
create unique index tags_workspace_name_idx on public.tags (workspace_id, lower(name));

create table public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);
create index task_tags_tag_idx on public.task_tags (tag_id);

create or replace function public.task_tags_same_workspace()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.tasks t join public.tags g on g.workspace_id = t.workspace_id
    where t.id = new.task_id and g.id = new.tag_id
  ) then
    raise exception 'tag and task must belong to the same workspace' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger task_tags_same_workspace
  before insert or update on public.task_tags
  for each row execute function public.task_tags_same_workspace();

-- ── Calendar events ─────────────────────────────────────────────────────────
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  description  text check (description is null or char_length(description) <= 5000),
  location     text check (location is null or char_length(location) <= 200),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default false,
  kind         text not null default 'event' check (kind in ('event', 'time_block')),
  task_id      uuid references public.tasks (id) on delete set null,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at >= starts_at),
  check (ends_at - starts_at <= interval '62 days')
);
create index events_workspace_time_idx on public.events (workspace_id, starts_at, ends_at);

-- ── Dashboards & widgets (per user, optionally scoped to a workspace) ───────
create table public.dashboards (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  is_default   boolean not null default false,
  position     double precision not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index dashboards_one_default on public.dashboards (owner_id) where is_default;
create index dashboards_owner_idx on public.dashboards (owner_id);

create table public.dashboard_widgets (
  id           uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  type         text not null check (type in (
                 'tasks_today', 'upcoming_events', 'projects', 'task_stats',
                 'calendar_month', 'quick_capture')),
  size         text not null default 'md' check (size in ('sm', 'md', 'lg', 'full')),
  position     double precision not null default 0,
  config       jsonb not null default '{}'::jsonb
                 check (jsonb_typeof(config) = 'object' and pg_column_size(config) < 8192),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index dashboard_widgets_dashboard_idx on public.dashboard_widgets (dashboard_id, position);

-- ── updated_at triggers ─────────────────────────────────────────────────────
create trigger workspaces_set_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger dashboards_set_updated_at before update on public.dashboards
  for each row execute function public.set_updated_at();
create trigger dashboard_widgets_set_updated_at before update on public.dashboard_widgets
  for each row execute function public.set_updated_at();

-- ── Seeding ─────────────────────────────────────────────────────────────────
-- New workspace → creator becomes owner + default task statuses.
create or replace function public.workspaces_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  insert into public.task_statuses (workspace_id, name, category, position, is_default) values
    (new.id, 'Por hacer', 'todo', 1, true),
    (new.id, 'En curso', 'in_progress', 2, false),
    (new.id, 'Hecha', 'done', 3, false),
    (new.id, 'Cancelada', 'canceled', 4, false);
  return new;
end;
$$;
create trigger workspaces_after_insert after insert on public.workspaces
  for each row execute function public.workspaces_after_insert();

-- Personal workspace + default dashboard for a user (idempotent).
create or replace function public.ensure_personal_space(uid uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  ws uuid;
  dash uuid;
begin
  select w.id into ws from public.workspaces w
   where w.created_by = uid and w.is_personal limit 1;
  if ws is null then
    insert into public.workspaces (name, is_personal, created_by)
    values ('Personal', true, uid) returning id into ws;
  end if;

  if not exists (select 1 from public.dashboards d where d.owner_id = uid) then
    insert into public.dashboards (owner_id, name, is_default)
    values (uid, 'Inicio', true) returning id into dash;
    insert into public.dashboard_widgets (dashboard_id, type, size, position) values
      (dash, 'quick_capture', 'full', 1),
      (dash, 'tasks_today', 'md', 2),
      (dash, 'upcoming_events', 'md', 3),
      (dash, 'task_stats', 'md', 4),
      (dash, 'projects', 'md', 5);
  end if;
  return ws;
end;
$$;
revoke execute on function public.ensure_personal_space(uuid) from public, anon, authenticated;
revoke execute on function public.workspaces_after_insert() from public, anon, authenticated;

create or replace function public.handle_new_user_space()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.ensure_personal_space(new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user_space() from public, anon, authenticated;

create trigger on_auth_user_created_space
  after insert on auth.users
  for each row execute function public.handle_new_user_space();

-- Backfill existing users (production has real accounts).
select public.ensure_personal_space(u.id) from auth.users u;

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects          enable row level security;
alter table public.task_statuses     enable row level security;
alter table public.tasks             enable row level security;
alter table public.tags              enable row level security;
alter table public.task_tags         enable row level security;
alter table public.events            enable row level security;
alter table public.dashboards        enable row level security;
alter table public.dashboard_widgets enable row level security;

revoke all on table public.workspaces, public.workspace_members, public.projects,
  public.task_statuses, public.tasks, public.tags, public.task_tags, public.events,
  public.dashboards, public.dashboard_widgets from anon;

-- workspaces
create policy "workspaces: members read" on public.workspaces for select to authenticated
  using (public.is_workspace_member(id) or created_by = (select auth.uid()));
create policy "workspaces: users create their own" on public.workspaces for insert to authenticated
  with check (created_by = (select auth.uid()) and not is_personal);
create policy "workspaces: admins update" on public.workspaces for update to authenticated
  using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));
create policy "workspaces: owner deletes non-personal" on public.workspaces for delete to authenticated
  using (not is_personal and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'));
revoke update on table public.workspaces from authenticated;
grant update (name, icon) on table public.workspaces to authenticated;

-- workspace_members (invitations arrive with the team features)
create policy "members: members read" on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- generic workspace-scoped tables
create policy "projects: members read" on public.projects for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "projects: editors insert" on public.projects for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy "projects: editors update" on public.projects for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "projects: editors delete" on public.projects for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

create policy "task_statuses: members read" on public.task_statuses for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "task_statuses: admins insert" on public.task_statuses for insert to authenticated
  with check (public.is_workspace_admin(workspace_id));
create policy "task_statuses: admins update" on public.task_statuses for update to authenticated
  using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));
create policy "task_statuses: admins delete" on public.task_statuses for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

create policy "tasks: members read" on public.tasks for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "tasks: editors insert" on public.tasks for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy "tasks: editors update" on public.tasks for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "tasks: editors delete" on public.tasks for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

create policy "tags: members read" on public.tags for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "tags: editors insert" on public.tags for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy "tags: editors update" on public.tags for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "tags: editors delete" on public.tags for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

create policy "task_tags: members read" on public.task_tags for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id)));
create policy "task_tags: editors insert" on public.task_tags for insert to authenticated
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.can_edit_workspace(t.workspace_id)));
create policy "task_tags: editors delete" on public.task_tags for delete to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.can_edit_workspace(t.workspace_id)));

create policy "events: members read" on public.events for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "events: editors insert" on public.events for insert to authenticated
  with check (public.can_edit_workspace(workspace_id));
create policy "events: editors update" on public.events for update to authenticated
  using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
create policy "events: editors delete" on public.events for delete to authenticated
  using (public.can_edit_workspace(workspace_id));

-- dashboards belong to one user; a workspace scope also requires membership
create policy "dashboards: owner reads" on public.dashboards for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "dashboards: owner inserts" on public.dashboards for insert to authenticated
  with check (owner_id = (select auth.uid())
              and (workspace_id is null or public.is_workspace_member(workspace_id)));
create policy "dashboards: owner updates" on public.dashboards for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())
              and (workspace_id is null or public.is_workspace_member(workspace_id)));
create policy "dashboards: owner deletes" on public.dashboards for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "widgets: dashboard owner reads" on public.dashboard_widgets for select to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = (select auth.uid())));
create policy "widgets: dashboard owner inserts" on public.dashboard_widgets for insert to authenticated
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = (select auth.uid())));
create policy "widgets: dashboard owner updates" on public.dashboard_widgets for update to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = (select auth.uid())));
create policy "widgets: dashboard owner deletes" on public.dashboard_widgets for delete to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = (select auth.uid())));
