# S11-09 — Presentation schedule and active-week visibility

Approved 18 November 2026. Latest classroom instructions supersede the initial two-tab idea: Week 4 contains the presentation schedule only; its activity form is hidden. Weekly Activities opens expanded and defaults to the highest active week.

## Student experience

- Weekly Activities retains its native collapse/expand control but starts expanded. If Week 3 and Week 4 are active, Week 4 opens. Students may browse another week; ordinary refreshes do not override that choice unless the highest active week changes. No active week/loading defaults to Week 1. Class/account changes reset the scope, and stale responses cannot overwrite another scope's schedule.
- Week 4 replaces the placeholder cards with a full-width ordered schedule. Each row shows the project, member names, team label, approximate start and presentation/Q&A allocation. The student's team is highlighted and repeated in a compact Your presentation summary. No student IDs or emails are displayed.
- All students must arrive ready at **8:30 AM**. Estimates are not arrival appointments and may move earlier or later. Students are asked to remain after their own presentation to support other teams where possible. There is no total-duration statement, end-time promise or “about two hours” text.
- Presentations include the live demo: 15 minutes for 1–3 members and 20 minutes for 4 members, followed by an additional 5 minutes for Q&A. Estimates follow the published array order from 08:30. Unknown, inconsistent, empty or unsupported group sizes are labelled for confirmation and stop later timing guesses. First start remains 08:30.
- The Week 4 Final Delivery Check entry point is removed from the weekly page. Its backend, form implementation and earlier submissions are retained, so this is a reversible visibility change rather than deletion.

## Publication and names

Migration: `supabase/migrations/20261118_presentation_schedule.sql`, mirrored in `supabase/schema.sql`.

The publication RPC keeps the existing signature, class authorization, full-team validation and separation of drafts from published order. Future publications include stable team IDs and frozen member names/counts, with names read from the selected class roster. Team IDs are not returned by the student-facing getter. Editing a later draft does not change the published sequence, projects or names; republish to update them.

Already-published snapshots lack members. The getter enriches those legacy entries from the same class's current roster using their existing team labels. It does not rewrite snapshots, publication dates, projects, positions or drafts. Once republished, names/counts are frozen in the new snapshot. If the roster later changes, the teacher should check and republish the schedule.

The getter resolves the authenticated activated student's active class, requires Week 4 to be open, and returns only that class's published order. It computes own-team highlighting server-side from the student's current roster membership. It does not grant students direct roster/table access or expose student IDs, emails, unpublished drafts or foreign-class names. The private member-lookup helper is not executable by anonymous or authenticated callers.

Teacher ordering retains Up/Down, Save draft and Publish order. Draft rows now show current member names and start estimates using the same timing helper. Published preview shows snapshot names, with current-roster enrichment for old snapshots. Week 4 activation controls are labelled Presentation schedule and explain that the activity form is hidden. No new timing settings UI is added; the approved 08:30 and 15/20 + 5 rules are centralized in `presentationTiming.ts`.

## Validation

- `npm run test:presentation-schedule`: 15 focused database, actual React component/hook and timing tests pass. Includes idempotence, legacy preservation, class/student/anonymous isolation, frozen publication names, draft separation, own-team identification, highest-active-week behavior, manual browsing, expanded default, missing data and no end-time/activity-form content.
- Existing class-isolation tests: 12 pass. Existing Intake/API tests: 248 pass.
- Fresh installation schema smoke test: 1 passes. Production build and diff checks pass. The existing bundle-size warning remains.
- A browser fixture uses actual components and global styles at desktop/mobile widths to check default expansion, Week 4 selection, team visibility/highlighting, timing text, manual browsing and horizontal overflow. It was attempted, but Chromium failed during startup with `socket() failed: Operation not permitted`. Browser layout assertions and screenshots are therefore not claimed as verified.
- No production database write, publication, model call or automatic change to the presentation order was made.

## Release

1. Run the additive migration in Supabase SQL Editor and confirm success before the UI merge. The existing student getter remains backward compatible with the old frontend.
2. On preview, use an enrolled student's account with Week 3 and Week 4 active. Confirm Weekly Activities is expanded, Week 4 selected, names and own-team highlight visible, and no Week 4 activity CTA exists. Check desktop/narrow layouts and approximate times against the teacher's current order.
3. Verify another active week can be selected manually, an unchanged refresh preserves it, closing Week 4 switches the highest-active default to Week 3, and closed/unpublished/error states do not disclose a stale schedule.
4. Check teacher ordering, draft save versus publish and member snapshots. Existing publications gain names by read enrichment without needing an automatic republish; teachers may explicitly republish if their roster has changed.
5. Follow the existing explicit merge instruction after migration confirmation. For rollback, retain enriched publications and helper functions; the old frontend ignores the extra snapshot fields. Do not delete submissions or presentation history.
