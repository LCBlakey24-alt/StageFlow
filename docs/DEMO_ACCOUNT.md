# Stage Flow demo account

The public test login is intentionally **not** a Supabase production identity.

Credentials:

- Email: `demo.admin@stageflow.test`
- Password: `StageFlowTest!26`

The account opens only the fictional browser-local Stage Flow demo workspace and is treated as
an Admin for UI testing. It has no `accountStaffId`, no organisation ID, and never loads or saves
the real Supabase organisation workspace.

This prevents a widely shared demo credential from becoming a route into real customer data.
