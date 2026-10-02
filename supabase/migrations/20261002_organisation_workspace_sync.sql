-- Shared Stage Flow organisation workspace.
-- Keeps authenticated timetable/register/assessment data consistent across devices.

create table if not exists public.organisation_workspaces (
  organisation_id uuid primary key references public.organisations(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists organisation_workspaces_updated_by_idx
  on public.organisation_workspaces (updated_by);

alter table public.organisation_workspaces enable row level security;

drop policy if exists "members can read workspace" on public.organisation_workspaces;
create policy "members can read workspace"
on public.organisation_workspaces for select
to authenticated
using (organisation_id = (select private.current_org_id()));

drop policy if exists "members can create workspace" on public.organisation_workspaces;
create policy "members can create workspace"
on public.organisation_workspaces for insert
to authenticated
with check (
  organisation_id = (select private.current_org_id())
  and (select auth.uid()) is not null
);

drop policy if exists "members can update workspace" on public.organisation_workspaces;
create policy "members can update workspace"
on public.organisation_workspaces for update
to authenticated
using (organisation_id = (select private.current_org_id()))
with check (
  organisation_id = (select private.current_org_id())
  and (select auth.uid()) is not null
);

revoke all on public.organisation_workspaces from anon;
grant select, insert, update on public.organisation_workspaces to authenticated;
