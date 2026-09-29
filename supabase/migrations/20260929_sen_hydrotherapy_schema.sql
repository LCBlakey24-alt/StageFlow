-- Stage Flow SEN Hydrotherapy cloud schema draft
-- Apply only to a development Supabase project first.
-- Do not store real pupil/SEN/hydrotherapy records until policies, advisors,
-- backups, retention and school approval have been checked.

create extension if not exists pgcrypto;

create type public.stageflow_staff_role as enum (
  'owner',
  'admin',
  'teacher',
  'hydrotherapy_assistant',
  'read_only'
);

create type public.stageflow_assessment_value as enum (
  'not_assessed',
  'almost_there',
  'passed'
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  retention_years integer not null default 5 check (retention_years between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.stageflow_staff_role not null default 'read_only',
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  display_name text not null,
  preferred_name text,
  school_reference text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id),
  archived_at timestamptz,
  archived_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  programme_type text not null default 'sen_hydrotherapy',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, name)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete set null,
  title text not null,
  session_date date not null,
  start_time time,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 240),
  location text,
  lead_staff_user_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.session_children (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  attendance text not null default 'present' check (attendance in ('present', 'absent', 'late', 'not_taking_part')),
  support_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, child_id)
);

create table public.criteria_sections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  programme_id uuid references public.programmes(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.criteria_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  section_id uuid not null references public.criteria_sections(id) on delete cascade,
  text text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  criteria_item_id uuid references public.criteria_items(id) on delete set null,
  value public.stageflow_assessment_value not null default 'not_assessed',
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, session_id, criteria_item_id)
);

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  entry_date date not null default current_date,
  mood text,
  regulation text,
  support_level text,
  communication text,
  activities text,
  what_went_well text,
  next_step text,
  note text,
  staff_user_id uuid not null default auth.uid() references auth.users(id),
  retention_until date not null,
  archived_at timestamptz,
  archived_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  child_id uuid references public.children(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.export_log (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  child_id uuid references public.children(id) on delete set null,
  export_type text not null,
  date_from date,
  date_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.retention_reviews (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  diary_entry_id uuid references public.diary_entries(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'keep', 'archive', 'delete_requested', 'deleted')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index staff_members_user_idx on public.staff_members(user_id) where active;
create index staff_members_org_idx on public.staff_members(organisation_id) where active;
create index children_org_idx on public.children(organisation_id);
create index sessions_org_date_idx on public.sessions(organisation_id, session_date);
create index session_children_org_session_idx on public.session_children(organisation_id, session_id);
create index assessment_results_child_idx on public.assessment_results(organisation_id, child_id);
create index diary_entries_child_date_idx on public.diary_entries(organisation_id, child_id, entry_date desc);
create index diary_entries_retention_idx on public.diary_entries(organisation_id, retention_until) where archived_at is null;
create index audit_log_org_created_idx on public.audit_log(organisation_id, created_at desc);

create schema if not exists private;

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.staff_members sm
      where sm.organisation_id = target_org
        and sm.user_id = auth.uid()
        and sm.active = true
    );
$$;

create or replace function private.has_org_role(target_org uuid, allowed_roles public.stageflow_staff_role[])
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.staff_members sm
      where sm.organisation_id = target_org
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role = any(allowed_roles)
    );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.stageflow_staff_role[]) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.stageflow_staff_role[]) to authenticated;

alter table public.organisations enable row level security;
alter table public.staff_members enable row level security;
alter table public.children enable row level security;
alter table public.programmes enable row level security;
alter table public.sessions enable row level security;
alter table public.session_children enable row level security;
alter table public.criteria_sections enable row level security;
alter table public.criteria_items enable row level security;
alter table public.assessment_results enable row level security;
alter table public.diary_entries enable row level security;
alter table public.audit_log enable row level security;
alter table public.export_log enable row level security;
alter table public.retention_reviews enable row level security;

grant select, insert, update on public.organisations to authenticated;
grant select, insert, update on public.staff_members to authenticated;
grant select, insert, update on public.children to authenticated;
grant select, insert, update on public.programmes to authenticated;
grant select, insert, update on public.sessions to authenticated;
grant select, insert, update on public.session_children to authenticated;
grant select, insert, update on public.criteria_sections to authenticated;
grant select, insert, update on public.criteria_items to authenticated;
grant select, insert, update on public.assessment_results to authenticated;
grant select, insert, update on public.diary_entries to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert on public.export_log to authenticated;
grant select, insert, update on public.retention_reviews to authenticated;

-- Organisations: visible only through active membership.
create policy "organisation members can view their organisation"
on public.organisations for select
to authenticated
using ((select private.is_org_member(id)));

create policy "organisation owners can update organisation settings"
on public.organisations for update
to authenticated
using ((select private.has_org_role(id, array['owner','admin']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(id, array['owner','admin']::public.stageflow_staff_role[])));

-- Staff memberships.
create policy "staff can view staff in their organisation"
on public.staff_members for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "admins can manage staff in their organisation"
on public.staff_members for update
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin']::public.stageflow_staff_role[])));

-- Shared organisation row access.
create policy "members can view children"
on public.children for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "writers can create children"
on public.children for insert
to authenticated
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])));

create policy "writers can update children"
on public.children for update
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])));

create policy "members can view programmes"
on public.programmes for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "admins and teachers can manage programmes"
on public.programmes for all
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])));

create policy "members can view sessions"
on public.sessions for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "session writers can manage sessions"
on public.sessions for all
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])));

create policy "members can view session children"
on public.session_children for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "session writers can manage session children"
on public.session_children for all
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])));

create policy "members can view criteria sections"
on public.criteria_sections for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "admins and teachers can manage criteria sections"
on public.criteria_sections for all
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])));

create policy "members can view criteria items"
on public.criteria_items for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "admins and teachers can manage criteria items"
on public.criteria_items for all
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher']::public.stageflow_staff_role[])));

create policy "members can view assessments"
on public.assessment_results for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "session writers can manage assessments"
on public.assessment_results for all
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])));

create policy "members can view diary entries"
on public.diary_entries for select
to authenticated
using ((select private.is_org_member(organisation_id)));

create policy "session writers can create diary entries"
on public.diary_entries for insert
to authenticated
with check (
  (select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[]))
  and staff_user_id = auth.uid()
);

create policy "session writers can update diary entries"
on public.diary_entries for update
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin','teacher','hydrotherapy_assistant']::public.stageflow_staff_role[])));

create policy "admins can view audit log"
on public.audit_log for select
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin']::public.stageflow_staff_role[])));

create policy "admins can create export log rows"
on public.export_log for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and (select private.has_org_role(organisation_id, array['owner','admin']::public.stageflow_staff_role[]))
);

create policy "admins can view export log"
on public.export_log for select
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin']::public.stageflow_staff_role[])));

create policy "admins can manage retention reviews"
on public.retention_reviews for all
to authenticated
using ((select private.has_org_role(organisation_id, array['owner','admin']::public.stageflow_staff_role[])))
with check ((select private.has_org_role(organisation_id, array['owner','admin']::public.stageflow_staff_role[])));

create or replace function public.set_diary_retention_until()
returns trigger
language plpgsql
security invoker
as $$
declare
  years_to_keep integer;
begin
  select retention_years into years_to_keep
  from public.organisations
  where id = new.organisation_id;

  new.retention_until := (new.entry_date + make_interval(years => coalesce(years_to_keep, 5)))::date;
  return new;
end;
$$;

create trigger diary_entries_retention_before_write
before insert or update of entry_date, organisation_id
on public.diary_entries
for each row execute function public.set_diary_retention_until();

create or replace view public.diary_entries_due_for_review
with (security_invoker = true)
as
select *
from public.diary_entries
where archived_at is null
  and retention_until <= current_date;
