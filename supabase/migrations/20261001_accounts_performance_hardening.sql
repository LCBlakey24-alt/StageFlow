-- Stage Flow account foundation performance hardening

create index if not exists staff_invitations_organisation_id_idx
  on public.staff_invitations (organisation_id);

create index if not exists staff_invitations_invited_by_idx
  on public.staff_invitations (invited_by);

drop policy if exists "owners can delete staff" on public.staff_members;
create policy "owners can delete staff"
on public.staff_members for delete
to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (select private.current_staff_role()) = 'owner'
  and auth_user_id is distinct from (select auth.uid())
);

drop policy if exists "admins can create invitations" on public.staff_invitations;
create policy "admins can create invitations"
on public.staff_invitations for insert
to authenticated
with check (
  organisation_id = (select private.current_org_id())
  and invited_by = (select auth.uid())
  and (select private.current_staff_role()) in ('owner','admin')
);
