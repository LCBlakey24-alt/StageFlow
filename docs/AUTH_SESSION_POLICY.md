# Authentication session policy

Stage Flow currently uses browser **session storage** for Supabase Auth.

This is deliberate for the product-hardening phase because Stage Flow may be used on shared
school, poolside or club tablets.

- Page refreshes in the same browser/app session keep the user signed in.
- The app does not intentionally create a long-lived local-storage login.
- Signing out clears the Supabase session and the Stage Flow staff bridge.
- A future "remember this personal device" option must be explicit and must not become the
  default for shared devices.
