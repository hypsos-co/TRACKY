-- ─────────────────────────────────────────────────────────────────────────────
-- TRACKY · Phase 3 · Trackers (Notion-like databases)
--   trackers → typed properties (relational definitions) → entries (values keyed
--   by property id, validated server-side per type) → relations between
--   entries (real FKs) → views (table/list/cards/kanban/calendar/chart).
-- Additive only.
--
-- down: drop table public.tracker_views, public.tracker_entry_links,
--       public.tracker_entries, public.tracker_properties, public.trackers cascade;
--       drop type public.tracker_property_type; restore the previous
--       dashboard_widgets_type_check constraint.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.tracker_property_type as enum (
  'text', 'long_text', 'integer', 'decimal', 'date', 'datetime', 'select', 'multi_select',
  'checkbox', 'status', 'percent', 'currency', 'formula', 'relation', 'url', 'rating',
  'scale', 'duration'
);

create table public.trackers (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  description      text check (description is null or char_length(description) <= 2000),
  icon             text check (icon is null or char_length(icon) <= 16),
  template_key     text check (template_key is null or char_length(template_key) <= 40),
  date_property_id uuid,
  position         double precision not null default 0,
  archived_at      timestamptz,
  created_by       uuid references auth.users (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index trackers_workspace_idx on public.trackers (workspace_id) where archived_at is null;

create table public.tracker_properties (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  type       public.tracker_property_type not null,
  config     jsonb not null default '{}'::jsonb
               check (jsonb_typeof(config) = 'object' and pg_column_size(config) < 8192),
  position   double precision not null default 0,
  is_title   boolean not null default false,
  required   boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index tracker_properties_name_idx on public.tracker_properties (tracker_id, lower(name));
create unique index tracker_properties_one_title on public.tracker_properties (tracker_id) where is_title;
create index tracker_properties_tracker_idx on public.tracker_properties (tracker_id, position);

alter table public.trackers
  add constraint trackers_date_property_fk
  foreign key (date_property_id) references public.tracker_properties (id) on delete set null;

create table public.tracker_entries (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers (id) on delete cascade,
  "values"   jsonb not null default '{}'::jsonb
               check (jsonb_typeof("values") = 'object' and pg_column_size("values") < 32768),
  position   double precision not null default 0,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tracker_entries_tracker_idx on public.tracker_entries (tracker_id, created_at);

-- Relation property values: real rows with FKs instead of ids hidden in JSON.
create table public.tracker_entry_links (
  entry_id        uuid not null references public.tracker_entries (id) on delete cascade,
  property_id     uuid not null references public.tracker_properties (id) on delete cascade,
  target_entry_id uuid not null references public.tracker_entries (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (entry_id, property_id, target_entry_id),
  check (entry_id <> target_entry_id)
);
create index tracker_entry_links_target_idx on public.tracker_entry_links (target_entry_id);

create table public.tracker_views (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references public.trackers (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  type       text not null check (type in ('table', 'list', 'cards', 'kanban', 'calendar', 'chart')),
  config     jsonb not null default '{}'::jsonb
               check (jsonb_typeof(config) = 'object' and pg_column_size(config) < 8192),
  position   double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tracker_views_tracker_idx on public.tracker_views (tracker_id, position);

create trigger trackers_set_updated_at before update on public.trackers
  for each row execute function public.set_updated_at();
create trigger tracker_entries_set_updated_at before update on public.tracker_entries
  for each row execute function public.set_updated_at();
create trigger tracker_views_set_updated_at before update on public.tracker_views
  for each row execute function public.set_updated_at();

-- ── Integrity ───────────────────────────────────────────────────────────────
-- date_property_id must belong to the same tracker.
create or replace function public.trackers_check_date_property()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.date_property_id is not null and not exists (
    select 1 from public.tracker_properties p
    where p.id = new.date_property_id and p.tracker_id = new.id and p.type in ('date', 'datetime')
  ) then
    raise exception 'date property must be a date property of this tracker' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trackers_check_date_property before update of date_property_id on public.trackers
  for each row execute function public.trackers_check_date_property();

-- Links: relation property of the source tracker, both entries in one workspace.
create or replace function public.tracker_links_check()
returns trigger language plpgsql set search_path = '' as $$
declare
  src_ws uuid;
  dst_ws uuid;
begin
  select t.workspace_id into src_ws
    from public.tracker_entries e
    join public.trackers t on t.id = e.tracker_id
    join public.tracker_properties p on p.tracker_id = t.id
   where e.id = new.entry_id and p.id = new.property_id and p.type = 'relation';
  select t.workspace_id into dst_ws
    from public.tracker_entries e join public.trackers t on t.id = e.tracker_id
   where e.id = new.target_entry_id;
  if src_ws is null or dst_ws is null or src_ws <> dst_ws then
    raise exception 'invalid relation link' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger tracker_links_check before insert or update on public.tracker_entry_links
  for each row execute function public.tracker_links_check();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.trackers            enable row level security;
alter table public.tracker_properties  enable row level security;
alter table public.tracker_entries     enable row level security;
alter table public.tracker_entry_links enable row level security;
alter table public.tracker_views       enable row level security;
revoke all on table public.trackers, public.tracker_properties, public.tracker_entries,
  public.tracker_entry_links, public.tracker_views from anon;

-- membership of the tracker's workspace (security definer, not exposed via API)
create or replace function private.tracker_role_ok(tracker uuid, for_write boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trackers t
    join public.workspace_members m on m.workspace_id = t.workspace_id
    where t.id = tracker and m.user_id = (select auth.uid())
      and (not for_write or m.role in ('owner', 'admin', 'member'))
  );
$$;
revoke execute on function private.tracker_role_ok(uuid, boolean) from public, anon;
grant execute on function private.tracker_role_ok(uuid, boolean) to authenticated;

create policy "trackers: members read" on public.trackers for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy "trackers: editors insert" on public.trackers for insert to authenticated
  with check (private.can_edit_workspace(workspace_id));
create policy "trackers: editors update" on public.trackers for update to authenticated
  using (private.can_edit_workspace(workspace_id)) with check (private.can_edit_workspace(workspace_id));
create policy "trackers: editors delete" on public.trackers for delete to authenticated
  using (private.can_edit_workspace(workspace_id));

create policy "properties: members read" on public.tracker_properties for select to authenticated
  using (private.tracker_role_ok(tracker_id, false));
create policy "properties: editors insert" on public.tracker_properties for insert to authenticated
  with check (private.tracker_role_ok(tracker_id, true));
create policy "properties: editors update" on public.tracker_properties for update to authenticated
  using (private.tracker_role_ok(tracker_id, true)) with check (private.tracker_role_ok(tracker_id, true));
create policy "properties: editors delete" on public.tracker_properties for delete to authenticated
  using (private.tracker_role_ok(tracker_id, true));

create policy "entries: members read" on public.tracker_entries for select to authenticated
  using (private.tracker_role_ok(tracker_id, false));
create policy "entries: editors insert" on public.tracker_entries for insert to authenticated
  with check (private.tracker_role_ok(tracker_id, true));
create policy "entries: editors update" on public.tracker_entries for update to authenticated
  using (private.tracker_role_ok(tracker_id, true)) with check (private.tracker_role_ok(tracker_id, true));
create policy "entries: editors delete" on public.tracker_entries for delete to authenticated
  using (private.tracker_role_ok(tracker_id, true));

create policy "links: members read" on public.tracker_entry_links for select to authenticated
  using (exists (select 1 from public.tracker_entries e where e.id = entry_id and private.tracker_role_ok(e.tracker_id, false)));
create policy "links: editors insert" on public.tracker_entry_links for insert to authenticated
  with check (exists (select 1 from public.tracker_entries e where e.id = entry_id and private.tracker_role_ok(e.tracker_id, true)));
create policy "links: editors delete" on public.tracker_entry_links for delete to authenticated
  using (exists (select 1 from public.tracker_entries e where e.id = entry_id and private.tracker_role_ok(e.tracker_id, true)));

create policy "views: members read" on public.tracker_views for select to authenticated
  using (private.tracker_role_ok(tracker_id, false));
create policy "views: editors insert" on public.tracker_views for insert to authenticated
  with check (private.tracker_role_ok(tracker_id, true));
create policy "views: editors update" on public.tracker_views for update to authenticated
  using (private.tracker_role_ok(tracker_id, true)) with check (private.tracker_role_ok(tracker_id, true));
create policy "views: editors delete" on public.tracker_views for delete to authenticated
  using (private.tracker_role_ok(tracker_id, true));

-- ── Dashboard: tracker widgets ──────────────────────────────────────────────
alter table public.dashboard_widgets drop constraint dashboard_widgets_type_check;
alter table public.dashboard_widgets add constraint dashboard_widgets_type_check check (type in (
  'tasks_today', 'upcoming_events', 'projects', 'task_stats', 'calendar_month', 'quick_capture',
  'tracker_chart', 'tracker_latest'));
