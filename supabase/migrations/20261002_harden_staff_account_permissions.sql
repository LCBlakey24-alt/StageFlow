-- Tighten staff account administration and immutable identity fields.

drop policy if exists "admins can insert staff" on public.staff_members;
revoke insert on public.staff_members from authenticated;

drop policy if exists "admins can update staff" on public.staff_members;
create policy "admins can update staff"
on public.staff_members for update
to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (
    (select private.current_staff_role()) = 'owner'
    or (
      (select private.current_staff_role()) = 'admin'
      and role <> 'owner'
    )
  )
)
with check (
  organisation_id = (select private.current_org_id())
  and (
    (select private.current_staff_role()) = 'owner'
    or (
      (select private.current_staff_role()) = 'admin'
      and role in ('admin','coach')
    )
  )
);

revoke update on public.staff_members from authenticated;
grant update (display_name, role, permissions, is_active) on public.staff_members to authenticated;

drop policy if exists "admins can update invitations" on public.staff_invitations;
revoke update on public.staff_invitations from authenticated;
grant select, insert, delete on public.staff_invitations to authenticated;

revoke update on public.organisations from authenticated;
grant update (name) on public.organisations to authenticated;

create or replace function private.protect_last_owner()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if old.role = 'owner'
     and (new.role <> 'owner' or new.is_active = false)
     and not exists (
       select 1
       from public.staff_members other
       where other.organisation_id = old.organisation_id
         and other.id <> old.id
         and other.role = 'owner'
         and other.is_active = true
     )
  then
    raise exception 'An organisation must keep at least one active owner';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_last_owner() from public, anon, authenticated;

drop trigger if exists protect_last_owner_stage_flow on public.staff_members;
create trigger protect_last_owner_stage_flow
before update on public.staff_members
for each row execute function private.protect_last_owner();
