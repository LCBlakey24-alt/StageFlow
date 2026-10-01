-- Stage Flow account foundation
-- Prepared for Supabase Auth + organisation/staff linking.

create schema if not exists private;

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  display_name text not null,
  role text not null default 'coach' check (role in ('owner','admin','coach')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists staff_members_org_email_key
  on public.staff_members (organisation_id, lower(email));

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'coach' check (role in ('admin','coach')),
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_invitations_email_idx
  on public.staff_invitations (lower(email), accepted_at, expires_at);

create or replace function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select organisation_id
  from public.staff_members
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function private.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select role
  from public.staff_members
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

revoke all on function private.current_org_id() from public, anon;
revoke all on function private.current_staff_role() from public, anon;
grant execute on function private.current_org_id() to authenticated;
grant execute on function private.current_staff_role() to authenticated;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  pending public.staff_invitations%rowtype;
  new_org_id uuid;
  requested_name text;
  requested_org text;
begin
  requested_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  requested_org := nullif(trim(coalesce(new.raw_user_meta_data->>'organisation_name', '')), '');

  select *
  into pending
  from public.staff_invitations
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if pending.id is not null then
    insert into public.staff_members (
      organisation_id, auth_user_id, email, display_name, role, permissions
    ) values (
      pending.organisation_id,
      new.id,
      new.email,
      coalesce(requested_name, pending.display_name, split_part(new.email, '@', 1)),
      pending.role,
      pending.permissions
    );

    update public.staff_invitations
    set accepted_at = now()
    where id = pending.id;
  else
    insert into public.organisations (name)
    values (coalesce(requested_org, 'My Stage Flow organisation'))
    returning id into new_org_id;

    insert into public.staff_members (
      organisation_id, auth_user_id, email, display_name, role, permissions
    ) values (
      new_org_id,
      new.id,
      new.email,
      coalesce(requested_name, split_part(new.email, '@', 1)),
      'owner',
      '{"sessions":true,"groups":true,"learners":true,"assess":true,"export":true,"framework":true,"certificates":true}'::jsonb
    );
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_stage_flow on auth.users;
create trigger on_auth_user_created_stage_flow
after insert on auth.users
for each row execute function private.handle_new_auth_user();

alter table public.organisations enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_invitations enable row level security;

drop policy if exists "members can read organisation" on public.organisations;
create policy "members can read organisation"
on public.organisations for select
to authenticated
using (id = (select private.current_org_id()));

drop policy if exists "admins can update organisation" on public.organisations;
create policy "admins can update organisation"
on public.organisations for update
to authenticated
using (
  id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
)
with check (
  id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
);

drop policy if exists "members can read staff" on public.staff_members;
create policy "members can read staff"
on public.staff_members for select
to authenticated
using (organisation_id = (select private.current_org_id()));

drop policy if exists "admins can insert staff" on public.staff_members;
create policy "admins can insert staff"
on public.staff_members for insert
to authenticated
with check (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
);

drop policy if exists "admins can update staff" on public.staff_members;
create policy "admins can update staff"
on public.staff_members for update
to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
)
with check (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
);

drop policy if exists "owners can delete staff" on public.staff_members;
create policy "owners can delete staff"
on public.staff_members for delete
to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) = 'owner'
  and auth_user_id is distinct from auth.uid()
);

drop policy if exists "admins can read invitations" on public.staff_invitations;
create policy "admins can read invitations"
on public.staff_invitations for select
to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
);

drop policy if exists "admins can create invitations" on public.staff_invitations;
create policy "admins can create invitations"
on public.staff_invitations for insert
to authenticated
with check (
  organisation_id = (select private.current_org_id())
  and invited_by = auth.uid()
  and (select private.current_staff_role()) in ('owner','admin')
);

drop policy if exists "admins can update invitations" on public.staff_invitations;
create policy "admins can update invitations"
on public.staff_invitations for update
to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
)
with check (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
);

drop policy if exists "admins can delete invitations" on public.staff_invitations;
create policy "admins can delete invitations"
on public.staff_invitations for delete
to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
);

revoke all on public.organisations from anon;
revoke all on public.staff_members from anon;
revoke all on public.staff_invitations from anon;

grant select, update on public.organisations to authenticated;
grant select, insert, update, delete on public.staff_members to authenticated;
grant select, insert, update, delete on public.staff_invitations to authenticated;
