create table if not exists public.organisation_settings (
  organisation_id uuid primary key references public.organisations(id) on delete cascade,
  framework jsonb not null default '{}'::jsonb,
  certificates jsonb not null default '[]'::jsonb,
  pack jsonb not null default '{}'::jsonb,
  audit jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.session_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null,
  programme text not null default 'Custom',
  day_name text not null check (day_name in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time time not null,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  venue text not null default '',
  year_group text not null default '',
  class_name text not null default '',
  criteria_group_id text,
  assessment_mode text not null default 'Stages only',
  features jsonb not null default '{"assessment":true,"notes":true,"evidence":false}'::jsonb,
  coach_staff_id uuid references public.staff_members(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learners (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  session_template_id uuid not null references public.session_templates(id) on delete cascade,
  display_name text not null,
  stage text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_notes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  source text not null default 'Admin',
  note_text text not null,
  author_name text not null default '',
  author_staff_id uuid references public.staff_members(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.session_occurrences (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  session_template_id uuid not null references public.session_templates(id) on delete cascade,
  occurrence_date date not null,
  started_at timestamptz,
  completed_at timestamptz,
  started_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (session_template_id, occurrence_date)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  occurrence_id uuid not null references public.session_occurrences(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  status text not null default 'Present' check (status in ('Present','Absent','Late','Not Taking Part')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (occurrence_id, learner_id)
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  occurrence_id uuid not null references public.session_occurrences(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  category text not null default 'criteria' check (category in ('criteria','national_curriculum')),
  criterion text not null,
  result text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (occurrence_id, learner_id, category, criterion)
);

create table if not exists public.learner_progress (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  category text not null default 'criteria' check (category in ('criteria','national_curriculum')),
  criterion text not null,
  result text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (learner_id, category, criterion)
);

create table if not exists public.learner_measurements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  occurrence_id uuid not null references public.session_occurrences(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  front_metres integer not null default 0 check (front_metres between 0 and 10000),
  back_metres integer not null default 0 check (back_metres between 0 and 10000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (occurrence_id, learner_id)
);

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  occurrence_id uuid not null references public.session_occurrences(id) on delete cascade,
  learner_id uuid not null references public.learners(id) on delete cascade,
  note_text text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (occurrence_id, learner_id)
);

create index if not exists session_templates_org_idx on public.session_templates (organisation_id);
create index if not exists session_templates_coach_idx on public.session_templates (coach_staff_id);
create index if not exists learners_org_session_idx on public.learners (organisation_id, session_template_id);
create index if not exists learner_notes_learner_idx on public.learner_notes (learner_id);
create index if not exists occurrences_org_date_idx on public.session_occurrences (organisation_id, occurrence_date);
create index if not exists occurrences_session_date_idx on public.session_occurrences (session_template_id, occurrence_date);
create index if not exists attendance_occurrence_idx on public.attendance_records (occurrence_id);
create index if not exists assessment_occurrence_idx on public.assessment_results (occurrence_id);
create index if not exists assessment_learner_idx on public.assessment_results (learner_id);
create index if not exists learner_progress_learner_idx on public.learner_progress (learner_id);
create index if not exists measurements_occurrence_idx on public.learner_measurements (occurrence_id);
create index if not exists session_notes_occurrence_idx on public.session_notes (occurrence_id);

create or replace function private.current_staff_id()
returns uuid language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select id from public.staff_members
  where auth_user_id = auth.uid() and is_active = true
  limit 1
$$;

create or replace function private.current_staff_permission(permission_name text, default_value boolean)
returns boolean language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select case
    when role in ('owner','admin') then true
    when permissions ? permission_name then coalesce((permissions ->> permission_name)::boolean, default_value)
    else default_value
  end
  from public.staff_members
  where auth_user_id = auth.uid() and is_active = true
  limit 1
$$;

create or replace function private.can_access_session(target_session uuid)
returns boolean language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1 from public.session_templates session
    where session.id = target_session
      and session.organisation_id = (select private.current_org_id())
      and (
        (select private.current_staff_role()) in ('owner','admin')
        or (
          session.coach_staff_id = (select private.current_staff_id())
          and (select private.current_staff_permission('sessions', true))
        )
      )
  )
$$;

create or replace function private.can_access_learner(target_learner uuid)
returns boolean language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1 from public.learners learner
    where learner.id = target_learner
      and learner.organisation_id = (select private.current_org_id())
      and (select private.can_access_session(learner.session_template_id))
      and (select private.current_staff_permission('learners', true))
  )
$$;

create or replace function private.can_access_occurrence(target_occurrence uuid)
returns boolean language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1 from public.session_occurrences occurrence
    where occurrence.id = target_occurrence
      and occurrence.organisation_id = (select private.current_org_id())
      and (select private.can_access_session(occurrence.session_template_id))
  )
$$;

create or replace function private.occurrence_feature_enabled(target_occurrence uuid, feature_name text, default_value boolean)
returns boolean language sql stable security definer
set search_path = public, private, pg_temp
as $$
  select case
    when session.features ? feature_name then coalesce((session.features ->> feature_name)::boolean, default_value)
    else default_value
  end
  from public.session_occurrences occurrence
  join public.session_templates session on session.id = occurrence.session_template_id
  where occurrence.id = target_occurrence
  limit 1
$$;

revoke all on function private.current_staff_id() from public, anon;
revoke all on function private.current_staff_permission(text, boolean) from public, anon;
revoke all on function private.can_access_session(uuid) from public, anon;
revoke all on function private.can_access_learner(uuid) from public, anon;
revoke all on function private.can_access_occurrence(uuid) from public, anon;
revoke all on function private.occurrence_feature_enabled(uuid, text, boolean) from public, anon;

grant execute on function private.current_staff_id() to authenticated;
grant execute on function private.current_staff_permission(text, boolean) to authenticated;
grant execute on function private.can_access_session(uuid) to authenticated;
grant execute on function private.can_access_learner(uuid) to authenticated;
grant execute on function private.can_access_occurrence(uuid) to authenticated;
grant execute on function private.occurrence_feature_enabled(uuid, text, boolean) to authenticated;

alter table public.organisation_settings enable row level security;
alter table public.session_templates enable row level security;
alter table public.learners enable row level security;
alter table public.learner_notes enable row level security;
alter table public.session_occurrences enable row level security;
alter table public.attendance_records enable row level security;
alter table public.assessment_results enable row level security;
alter table public.learner_progress enable row level security;
alter table public.learner_measurements enable row level security;
alter table public.session_notes enable row level security;

create policy "members read settings" on public.organisation_settings for select to authenticated
using (organisation_id = (select private.current_org_id()));
create policy "admins create settings" on public.organisation_settings for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));
create policy "admins update settings" on public.organisation_settings for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'))
with check (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));

create policy "staff read assigned sessions" on public.session_templates for select to authenticated
using ((select private.can_access_session(id)));
create policy "admins create sessions" on public.session_templates for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));
create policy "admins update sessions" on public.session_templates for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'))
with check (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));
create policy "admins delete sessions" on public.session_templates for delete to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));

create policy "staff read assigned learners" on public.learners for select to authenticated
using ((select private.can_access_learner(id)));
create policy "admins create learners" on public.learners for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));
create policy "admins update learners" on public.learners for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'))
with check (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));
create policy "admins delete learners" on public.learners for delete to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));

create policy "staff read learner notes" on public.learner_notes for select to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_learner(learner_id)));
create policy "admins create learner notes" on public.learner_notes for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));
create policy "admins delete learner notes" on public.learner_notes for delete to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));

create policy "staff read occurrences" on public.session_occurrences for select to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_session(session_template_id)));
create policy "staff create occurrences" on public.session_occurrences for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_session(session_template_id)));
create policy "staff update occurrences" on public.session_occurrences for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_session(session_template_id)))
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_session(session_template_id)));
create policy "admins delete occurrences" on public.session_occurrences for delete to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.current_staff_role()) in ('owner','admin'));

create policy "staff read attendance" on public.attendance_records for select to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)));
create policy "staff create attendance" on public.attendance_records for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)));
create policy "staff update attendance" on public.attendance_records for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)))
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)));

create policy "staff read assessment results" on public.assessment_results for select to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)));
create policy "staff create assessment results" on public.assessment_results for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)) and (select private.current_staff_permission('assess', true)) and (select private.occurrence_feature_enabled(occurrence_id, 'assessment', true)));
create policy "staff update assessment results" on public.assessment_results for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)))
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)) and (select private.current_staff_permission('assess', true)) and (select private.occurrence_feature_enabled(occurrence_id, 'assessment', true)));

create policy "staff read learner progress" on public.learner_progress for select to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_learner(learner_id)));
create policy "staff create learner progress" on public.learner_progress for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_learner(learner_id)) and (select private.current_staff_permission('assess', true)));
create policy "staff update learner progress" on public.learner_progress for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_learner(learner_id)))
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_learner(learner_id)) and (select private.current_staff_permission('assess', true)));

create policy "staff read measurements" on public.learner_measurements for select to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)));
create policy "staff create measurements" on public.learner_measurements for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)) and (select private.current_staff_permission('assess', true)) and (select private.occurrence_feature_enabled(occurrence_id, 'assessment', true)));
create policy "staff update measurements" on public.learner_measurements for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)))
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)) and (select private.current_staff_permission('assess', true)) and (select private.occurrence_feature_enabled(occurrence_id, 'assessment', true)));

create policy "staff read session notes" on public.session_notes for select to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)));
create policy "staff create session notes" on public.session_notes for insert to authenticated
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)) and (select private.occurrence_feature_enabled(occurrence_id, 'notes', true)));
create policy "staff update session notes" on public.session_notes for update to authenticated
using (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)))
with check (organisation_id = (select private.current_org_id()) and (select private.can_access_occurrence(occurrence_id)) and (select private.can_access_learner(learner_id)) and (select private.occurrence_feature_enabled(occurrence_id, 'notes', true)));

revoke all on public.organisation_settings from anon, authenticated;
revoke all on public.session_templates from anon, authenticated;
revoke all on public.learners from anon, authenticated;
revoke all on public.learner_notes from anon, authenticated;
revoke all on public.session_occurrences from anon, authenticated;
revoke all on public.attendance_records from anon, authenticated;
revoke all on public.assessment_results from anon, authenticated;
revoke all on public.learner_progress from anon, authenticated;
revoke all on public.learner_measurements from anon, authenticated;
revoke all on public.session_notes from anon, authenticated;

grant select, insert, update on public.organisation_settings to authenticated;
grant select, insert, update, delete on public.session_templates to authenticated;
grant select, insert, update, delete on public.learners to authenticated;
grant select, insert, delete on public.learner_notes to authenticated;
grant select, insert, update, delete on public.session_occurrences to authenticated;
grant select, insert, update on public.attendance_records to authenticated;
grant select, insert, update on public.assessment_results to authenticated;
grant select, insert, update on public.learner_progress to authenticated;
grant select, insert, update on public.learner_measurements to authenticated;
grant select, insert, update on public.session_notes to authenticated;
