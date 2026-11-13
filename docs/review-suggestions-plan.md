# Session review suggestions — implementation and acceptance

Goal: prepare one tentative review from student updates, let the teacher discuss, edit and publish without mandatory criteria mapping.

- Explicit Generate/Update inside the student review. No background paid generation.
- Scope is the current intake/student/class, capped at current session. Baseline is latest earlier published review with matching summary revision and no open correction; drafts never advance the baseline.
- AI suggestion persists separately in the current teacher-only draft. Adoption requires confirmation before replacing existing prose; observations and prior publications remain intact.
- Simple prose is publishable in detailed mode; old criteria remain under an optional disclosure. Quick mode retains its non-verification notice.
- No grading or automatic publication. No private teacher notes sent to the model. Missing records are not failures.

Acceptance: S3 baseline with S4/S5 updates; no baseline; draft-only prior review; stale corrected baseline; future/class/student exclusion; regeneration preserves prose; switch student during generation; errors preserve edits; narrative publication and draft-only suggestion status; previous detailed records and student feedback remain readable.

Deploy: apply 20261112_review_suggestion_context.sql before app rollout. Existing OpenAI API key reused; optional REVIEW_SUGGESTION_MODEL, default gpt-5-mini. No production migration or paid calls performed during implementation.

Validation: production build and API TypeScript compilation passed. 15 database tests (10 regression + 5 new) and 3 mocked API tests passed. Browser rehearsal script added, but Chromium launch was blocked by environment socket permissions; visual/interaction QA remains outstanding. No paid calls, merge, deployment or production DB writes.

## Compact workspace follow-up
- One main column with a compact roster. Sources open on demand; mode and generation metadata are disclosures.
- Progress and questions share the guide row on wide screens; feedback and adoption sit below. Save/publish controls are outside the scrolling body.
- New output is bounded and internal record IDs/enums rejected. Legacy suggestions retain full original under disclosures; regeneration is optional and teacher prose remains untouched.
- Build and 19 database/API checks pass. Browser layout/interaction rehearsal remains unverified: local Chromium socket permissions are blocked and cloud browser cannot connect to the local preview. Do not treat screenshots or visual QA as completed.
- No migration required for this follow-up. No production deployment or paid model call performed.

## Fixed focus categories and student-facing feedback
Shared vocabulary: Delivery, Implementation, Understanding, Testing, Evidence, Contribution, Documentation, Communication. AI chooses only from this dictionary; tags carry no automatic grade or risk rating. Generated feedback addresses the student in categorized issue/clarification/recommendation bullets, separate from the teacher conversation guide. Missing evidence is uncertainty, never proof of failure. No current teacher verification is invented.

Teachers explicitly adopt points, edit labels/text/sections, remove or add points, and publish. Regeneration never replaces teacher points. Existing prose and criteria are retained. Students receive the same categories and definitions only after publication. Prior published points naturally feed the next review baseline. No automated resolution or ranking is introduced.

Rollout: apply 20261114_review_focus_feedback.sql before frontend deployment. It updates only the existing save RPC validation and publication allow-list, no table changes or historical rewrites. Legacy prose-only reviews continue to work. No production DB operations or paid provider calls during implementation. Build and database/API/render tests pass; interactive browser/visual verification remains outstanding due to the previously identified environment limitations.
