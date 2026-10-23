# Explicit student team allocation

Create students independently of team/project allocation. A new manual student defaults to Unassigned, and CSV Team may be blank. Teachers choose Team 1–8 explicitly in the roster editor. Project setup assigns one project to that team and displays its current members and any unassigned students. No student is silently placed in Team 1.

## Rollout

1. Apply `supabase/migrations/20261023_sprint10_unassigned_roster.sql` after the existing teaching-class migration, before merging/deploying this UI.
2. The transaction permits NULL roster teams, removes any database default, reinstalls the roster-to-team synchronization trigger and backfills missing team identities from existing explicit roster numbers. Rerunning is safe. It preserves existing team/project/assignment/history IDs and existing student allocations. It cannot distinguish intentional old Team 1 allocations from defaults, so those are not automatically cleared.
3. Deploy the application. To correct an old accidental assignment, edit the student and select Unassigned. Empty historical teams/assignments are retained.

Unassigned students can have accounts prepared and sign in, but see a waiting-for-team screen with a Check team assignment button. Activation and team-based activity inserts reject missing teams instead of fabricating a team label. Once assigned, the student can check again and continue normally. Teacher review payloads label missing teams as Not assigned. Class-level RLS and cross-class restrictions are retained.

## Validation

- `npm test` and `npm run build`.
- `S10_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/classes/roster-teams.test.mjs tests/classes/isolation.test.mjs`
- With `S10_PGLITE_MODULE`, `S10_PLAYWRIGHT_MODULE` and `S10_CHROMIUM_EXECUTABLE` set, run `node tests/classes/browser.mjs`. It covers blank-team CSV import, manual Unassigned creation, explicit team allocation and real project assignment against isolated SQL with synthetic Auth.
- With the Playwright/Chromium variables set, run `node tests/auth/focus-browser.mjs` separately. It also covers the unassigned-student waiting screen and retry after allocation, plus draft preservation on auth refresh.

No production accounts, database records or passwords are changed by these tests.
