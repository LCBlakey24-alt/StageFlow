# Stage Flow

Timetable-first session, attendance and optional assessment software for coached activities.

## Current architecture

- React + Vite frontend
- Vercel deployment
- Supabase Auth for email/password accounts
- Supabase Postgres + RLS for organisation/account boundaries
- Protected Edge Functions for staff invitations and validated workspace saves
- Local demo storage remains only as a development fallback
- Real-account photo/video evidence remains disabled until secure storage and retention controls are completed

## Database

Do **not** run `supabase/schema.sql`. It is now a harmless compatibility pointer.

The authoritative database changes are in `supabase/migrations/`.

## Production caution

Stage Flow is still in product-hardening/testing. Do not enter real pupil health, safeguarding,
medical, photo or video data until the remaining security/compliance launch work is completed.
