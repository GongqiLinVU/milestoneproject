# S11-06 — Team numbers beyond eight

Status: implemented; production SQL and browser acceptance pending.

Teachers allocate a team through Class roster → Edit student → Team. The number input accepts a whole number from 1 to 32767 (the existing PostgreSQL smallint storage range). Blank means Unassigned. Saving continues to create the class-scoped team identity automatically; Project setup then assigns its project. CSV imports accept the same range. Existing teams, UUIDs, memberships, assignments and historical records are retained.

The old 1–8 limit also existed in legacy activity/check-in label constraints and several policies. The incremental migration replaces only that exact label expression, preserving other constraint predicates and all policy roles, commands, permissiveness, class and identity checks. No grants or functions change. Teacher health summaries and activity editing derive team options from loaded class teams/records instead of eight fixed options. The peer-review fallback accepts an explicit Team label; normal review-target selection remains unchanged.

## Release

1. Run only `supabase/migrations/20261102_sprint11_team_numbers.sql` in the existing database. Do not rerun schema.sql. The transaction is repeatable and compatible with the current frontend. Constraint changes take brief table locks; apply while no roster edits are in flight.
2. Merge/deploy the frontend after Joseph confirms SQL succeeded.
3. In the intended class, edit a student to Team 12. Confirm Project setup shows Team 12 and its members; assign a project and check the student's portal.
4. Verify blank, 0, negative and fractional Team input, CSV Team 12, and relevant Weekly Activities. Browser/hosted acceptance remains pending; no production writes were performed during implementation.

Validation: TypeScript/Vite production build passed. 23/23 isolated DB checks passed: five expanded-team checks plus existing shared-library/fresh-schema and enrolment suites. New checks cover repeatability, preserved IDs and policy semantics, automatic team creation and updates, same-number class isolation, Unassigned, invalid numbers, Team 12 project/context/activation and authenticated legacy check-in. The fresh-schema test includes this migration's final state.

Recovery: reverting frontend code is safe; leave the expanded DB constraints. Do not restore 1–8 checks after Team 9+ data exists. Never delete or renumber records to force a rollback.
