-- Remove broad default grants and force organisation workspace writes through
-- the protected save-workspace Edge Function.

revoke all on public.organisations from anon, authenticated;
revoke all on public.staff_members from anon, authenticated;
revoke all on public.staff_invitations from anon, authenticated;
revoke all on public.organisation_workspaces from anon, authenticated;

grant select on public.organisations to authenticated;
grant update (name) on public.organisations to authenticated;

grant select, delete on public.staff_members to authenticated;
grant update (display_name, role, permissions, is_active) on public.staff_members to authenticated;

grant select, insert, delete on public.staff_invitations to authenticated;

grant select, insert on public.organisation_workspaces to authenticated;

drop policy if exists "members can create workspace" on public.organisation_workspaces;
create policy "admins can create workspace"
on public.organisation_workspaces for insert
to authenticated
with check (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) in ('owner','admin')
);

drop policy if exists "members can update workspace" on public.organisation_workspaces;
