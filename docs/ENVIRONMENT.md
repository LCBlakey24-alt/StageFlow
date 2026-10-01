# Environment setup

Stage Flow supports two modes:

- **Demo mode**: if Supabase variables are absent, the existing local/PIN demo continues to work.
- **Account mode**: when the variables below are present, Stage Flow requires Supabase email/password authentication before the app opens.

## Vercel public environment variables

VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY

For compatibility, the frontend also accepts the older VITE_SUPABASE_ANON_KEY, but new deployments should use a modern Supabase publishable key.

## Important security rule

Only publishable/anon credentials belong in Vite frontend variables. Never put a Supabase secret key or service-role key into VITE_* variables or frontend source code.

## Account flow

1. A new organisation owner chooses **Create admin account**.
2. Supabase Auth creates the email/password identity and sends email confirmation when enabled.
3. The Stage Flow database trigger creates the organisation and owner staff record.
4. Invited staff sign up with the invited email; the trigger attaches them to the pending organisation invitation instead of creating another organisation.
5. Stage Flow loads the authenticated staff record and uses its role/permissions for the UI.
6. Database RLS remains the real security boundary once application data is moved from local demo storage into Supabase.

## Email

For production auth mail, connect Supabase Auth to a transactional provider such as Resend rather than relying on the default development email service.


## Current demo connection

The current Stage Flow demo includes the project's public Supabase URL and publishable key as safe frontend fallbacks, so authentication can be tested without manually configuring Vercel variables. These values are intentionally public client credentials and are protected by database RLS.

For production operations, Vercel environment variables should still be preferred so the publishable key can be rotated without a source-code change.
