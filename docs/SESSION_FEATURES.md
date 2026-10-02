# Session feature flags

Stage Flow sessions can independently enable or disable:

- `assessment` — criteria / National Curriculum marking.
- `notes` — learner/session notes.
- `evidence` — photo/video evidence.

Existing/demo sessions default to all three features enabled for backwards compatibility.
New sessions created by the Admin wizard default to assessment + notes enabled and evidence disabled.

For authenticated cloud accounts, evidence upload is intentionally blocked until secure
Supabase Storage policies, organisation scoping, consent and retention controls are implemented.
The flag is retained now so session configuration will not need redesigning later.

A session with assessment disabled (or with no assessable criteria/NC content) finishes directly
from the register rather than forcing the coach through an empty assessment screen.
