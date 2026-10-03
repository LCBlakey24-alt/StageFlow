create or replace function private.enforce_stage_flow_org_links()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  linked_org uuid;
  linked_session uuid;
  occurrence_session uuid;
begin
  if tg_table_name = 'session_templates' then
    if new.coach_staff_id is not null then
      select organisation_id into linked_org from public.staff_members where id = new.coach_staff_id;
      if linked_org is distinct from new.organisation_id then raise exception 'Coach must belong to the same organisation'; end if;
    end if;
  elsif tg_table_name = 'learners' then
    select organisation_id into linked_org from public.session_templates where id = new.session_template_id;
    if linked_org is distinct from new.organisation_id then raise exception 'Learner session must belong to the same organisation'; end if;
  elsif tg_table_name = 'learner_notes' then
    select organisation_id into linked_org from public.learners where id = new.learner_id;
    if linked_org is distinct from new.organisation_id then raise exception 'Learner note must belong to the same organisation'; end if;
    if new.author_staff_id is not null then
      select organisation_id into linked_org from public.staff_members where id = new.author_staff_id;
      if linked_org is distinct from new.organisation_id then raise exception 'Note author must belong to the same organisation'; end if;
    end if;
  elsif tg_table_name = 'session_occurrences' then
    select organisation_id into linked_org from public.session_templates where id = new.session_template_id;
    if linked_org is distinct from new.organisation_id then raise exception 'Occurrence session must belong to the same organisation'; end if;
  elsif tg_table_name in ('attendance_records','assessment_results','learner_measurements','session_notes') then
    select organisation_id, session_template_id into linked_org, occurrence_session
    from public.session_occurrences where id = new.occurrence_id;
    if linked_org is distinct from new.organisation_id then raise exception 'Occurrence record must belong to the same organisation'; end if;

    select organisation_id, session_template_id into linked_org, linked_session
    from public.learners where id = new.learner_id;
    if linked_org is distinct from new.organisation_id then raise exception 'Learner record must belong to the same organisation'; end if;
    if linked_session is distinct from occurrence_session then raise exception 'Learner and occurrence must belong to the same recurring session'; end if;
  elsif tg_table_name = 'learner_progress' then
    select organisation_id into linked_org from public.learners where id = new.learner_id;
    if linked_org is distinct from new.organisation_id then raise exception 'Learner progress must belong to the same organisation'; end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_stage_flow_org_links() from public, anon, authenticated;

drop trigger if exists enforce_session_template_org on public.session_templates;
create trigger enforce_session_template_org before insert or update on public.session_templates for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_learner_org on public.learners;
create trigger enforce_learner_org before insert or update on public.learners for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_learner_note_org on public.learner_notes;
create trigger enforce_learner_note_org before insert or update on public.learner_notes for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_occurrence_org on public.session_occurrences;
create trigger enforce_occurrence_org before insert or update on public.session_occurrences for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_attendance_org on public.attendance_records;
create trigger enforce_attendance_org before insert or update on public.attendance_records for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_assessment_org on public.assessment_results;
create trigger enforce_assessment_org before insert or update on public.assessment_results for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_measurement_org on public.learner_measurements;
create trigger enforce_measurement_org before insert or update on public.learner_measurements for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_session_note_org on public.session_notes;
create trigger enforce_session_note_org before insert or update on public.session_notes for each row execute function private.enforce_stage_flow_org_links();
drop trigger if exists enforce_progress_org on public.learner_progress;
create trigger enforce_progress_org before insert or update on public.learner_progress for each row execute function private.enforce_stage_flow_org_links();

create or replace function private.learner_feature_enabled(target_learner uuid, feature_name text, default_value boolean)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select case
    when session.features ? feature_name then coalesce((session.features ->> feature_name)::boolean, default_value)
    else default_value
  end
  from public.learners learner
  join public.session_templates session on session.id = learner.session_template_id
  where learner.id = target_learner
  limit 1
$$;

revoke all on function private.learner_feature_enabled(uuid, text, boolean) from public, anon;
grant execute on function private.learner_feature_enabled(uuid, text, boolean) to authenticated;

drop policy if exists "staff create learner progress" on public.learner_progress;
create policy "staff create learner progress"
on public.learner_progress for insert to authenticated
with check (
  organisation_id = (select private.current_org_id())
  and (select private.can_access_learner(learner_id))
  and (select private.current_staff_permission('assess', true))
  and (select private.learner_feature_enabled(learner_id, 'assessment', true))
);

drop policy if exists "staff update learner progress" on public.learner_progress;
create policy "staff update learner progress"
on public.learner_progress for update to authenticated
using (
  organisation_id = (select private.current_org_id())
  and (select private.can_access_learner(learner_id))
)
with check (
  organisation_id = (select private.current_org_id())
  and (select private.can_access_learner(learner_id))
  and (select private.current_staff_permission('assess', true))
  and (select private.learner_feature_enabled(learner_id, 'assessment', true))
);
