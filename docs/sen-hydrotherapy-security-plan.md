# Stage Flow SEN Hydrotherapy Security Plan

This document is the working security blueprint for turning the demo-only SEN Hydrotherapy workflow into a secure, shared, database-backed module.

**Current status:** demo/local workflow only. Do not enter real pupil names, SEN notes, medical notes, safeguarding notes or identifiable child records until the cloud database, authentication, Row Level Security and school policy checks are complete.

## Product goal

The SEN Hydrotherapy module should support:

- Hydrotherapy criteria and goals.
- Daily diary-style notes for each child.
- A dated child timeline showing previous sessions, criteria progress and diary entries.
- Shared use across school computers, iPads and phones.
- Installable app/PWA behaviour.
- Secure cloud database storage.
- Five-year record retention support, configurable to match the school/trust retention schedule.
- Audit logging for who created, edited, exported or archived records.

## Data sensitivity

Hydrotherapy notes may include information about disability, SEN, health, physical support, communication needs, behaviour, regulation, personal care routines or safeguarding context. Treat this as high-risk pupil information.

The app should assume:

- No public access.
- No shared staff accounts.
- No real pupil data in local-only storage.
- No service-role or database secret in the browser.
- No export without an audit trail.
- No deletion without role checks and retention policy awareness.

## Recommended stack

- **Frontend:** Stage Flow on Vercel.
- **Installable app:** PWA manifest + controlled app-shell caching only.
- **Database:** Supabase Postgres.
- **Auth:** Supabase Auth.
- **Authorization:** Postgres Row Level Security on every exposed table.
- **Audit:** append-only audit table plus triggers/server-side writes.
- **Retention:** retention_until fields and review/archive workflow.
- **Backups:** Supabase backups plus export/restore testing.

## Staff roles

Suggested organisation-level roles:

| Role | Intended access |
|---|---|
| owner | Full organisation administration, staff management, export and retention controls. |
| admin | Manage children, programmes, staff access, reports and retention review. |
| teacher | View/write records for assigned organisation sessions. |
| hydrotherapy_assistant | View/write hydrotherapy sessions, criteria and diary entries. |
| read_only | View timelines and reports only. |

All role decisions must be enforced in the database with RLS, not only hidden in the UI.

## Core tables

Minimum cloud schema:

- organisations
- staff_members
- children
- programmes
- sessions
- session_children
- criteria_sections
- criteria_items
- assessment_results
- diary_entries
- audit_log
- export_log
- retention_reviews

## Row Level Security rules

Every table in the exposed schema must have RLS enabled.

Baseline rule:

- Users can only access rows for organisations where they are active staff members.

Write rule:

- Only owner/admin/teacher/hydrotherapy_assistant can create or update session notes and assessments.

Export rule:

- Only owner/admin, or a specifically granted report/export role, can export records.

Delete rule:

- Prefer archive/retention review over hard delete.
- Hard delete should be restricted to owner/admin and audited.

## Five-year retention model

Every diary entry should have:

- entry_date
- created_at
- retention_until
- archived_at
- archived_by
- deletion_review_status

Default calculation:

`retention_until = entry_date + 5 years`

This should be configurable because the school/trust retention schedule is authoritative.

## Audit log events

Audit events should include:

- child_created
- child_updated
- diary_created
- diary_updated
- assessment_created
- assessment_updated
- report_exported
- record_archived
- retention_reviewed
- staff_role_changed

Each event should store:

- organisation_id
- actor_user_id
- child_id where relevant
- session_id where relevant
- table_name
- record_id
- action
- created_at
- safe metadata JSON

Avoid storing full sensitive note bodies in audit metadata unless necessary.

## Export behaviour

Before exporting a child timeline, the app should:

1. Check the user has export permission.
2. Create an export_log row.
3. Generate the file server-side or via a protected function.
4. Include organisation, child, date range and staff identity in the audit trail.

## Local storage rule

Local storage can be used for demo data, UI state or drafts only.

For real SEN/hydrotherapy records:

- Do not store identifiable diary notes permanently in localStorage.
- Use Supabase Auth sessions and encrypted transport.
- Consider short-lived draft storage only, with clear warning and auto-clear.

## PWA/installable app rule

The installed app should cache only the app shell/static assets.

Do not cache SEN/hydrotherapy child records in the service worker cache.

## Supabase implementation notes

Use:

- publishable key in frontend only
- service role key only in trusted server/Edge Function code
- RLS policies using `TO authenticated`
- ownership/org predicates in every policy
- `WITH CHECK` on insert/update policies
- private non-exposed helper functions for membership checks
- security-invoker views where views are needed

Do not use user-editable metadata for authorization. Staff roles should live in database tables and/or controlled app metadata, not user_metadata.

## Build phases

### Phase 1 — Demo/local workflow

- Add SEN Hydrotherapy criteria groups.
- Add diary note panel.
- Add child timeline panel.
- Add CSV export for demo review.
- Add warnings not to enter real data.

### Phase 2 — Supabase foundation

- Create Supabase project.
- Apply schema migration.
- Enable RLS.
- Create test organisation and test staff.
- Run Supabase security advisors.
- Generate TypeScript types.

### Phase 3 — Cloud app integration

- Add login/logout.
- Load organisations/staff/children/sessions from Supabase.
- Save diary entries to database.
- Read child timeline from database.
- Audit every write/export.

### Phase 4 — School readiness

- Confirm school/trust lawful basis and Article 9 condition.
- Confirm retention schedule.
- Complete DPIA.
- Confirm processor/controller arrangement.
- Test backup/restore.
- Staff training notes.
- Go-live checklist.
