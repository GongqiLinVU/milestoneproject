# Independent classes and delegated teacher accounts

Each teaching_blocks row is now an independent teaching instance, identified by course + year + block + class code (for example NIT3004 · 2026 · 2B1 · C1). Existing rows keep their IDs and receive course NIT3004 and class C1. Existing student work, intakes, teams and Session IDs are not migrated into new rows. Multiple classes can be active at once; Team 1 and S1–S10 remain local to each instance.

## Responsibilities

- The platform administrator creates classes, activates/archives them, creates teacher accounts and assigns/revokes classes.
- Assigned teachers manage their own rosters, existing CSV imports, student account preparation/password distribution, projects, Session controls and reviews. One teacher may manage several classes and one class may have several teachers.
- Student accounts remain global identities; a continuing student reuses the existing account. A class roster is an enrolment, not a new login account. Preparing accounts does not overwrite an existing password.
- New teacher passwords are displayed only in the administrator's current page, not saved in browser storage or emailed automatically. Teachers must set their own password before accessing class data. Administrators distribute the credentials themselves.

## Deployment order — database first, then application

Apply `supabase/migrations/20261023_sprint10_teaching_classes.sql` in the existing project's SQL editor **before** merging/deploying this application's change. No migration was run on production during development. Preview shares the production database, so use an isolated database for experimentation.

The migration bootstraps the sole pre-existing teacher as platform administrator. It never promotes all teachers. If there is more than one (or none), the transaction stops without applying changes. Explicitly select the existing owner's UUID, then rerun the migration in the SAME SQL editor execution with this prefix:

```sql
-- Find the existing owner, using their actual sign-in email.
select id, email from auth.users where lower(email) = lower('YOUR_EXISTING_LOGIN_EMAIL');
-- Prefix the migration with the selected UUID; do not create a second owner login.
set studio.bootstrap_administrator = 'YOUR_EXISTING_OWNER_UUID';
```

Only use the automatic sole-teacher bootstrap if that single existing teacher is the intended owner. Existing additional teachers receive no class access until the administrator assigns them. The migration is idempotent, keeps existing records, and checks parent/class consistency on new writes. Back up the database using your normal process before this schema/authorization change.

After deployment, sign in as the existing owner and open **Classes & teachers**. Keep the original C1, create C2/C3 with the intended dates, create teachers and assign their classes, then distribute the credentials. Teachers import their own class CSVs and prepare student accounts. Activate the classes when ready. Each teacher generates/configures their own Session schedule using the existing Session controls.

## Authorization coverage

Class ownership is checked in PostgreSQL restrictive RLS policies, teacher security-definer RPCs, student-account provisioning/reset, poster upload/view and teaching-suggestion APIs. UI filtering is not the authorization boundary. Disabling a teacher or deleting a membership takes effect on subsequent database/API requests, including requests made with an older valid JWT. Global student-account updates cannot be made through direct teacher PATCH; credential operations go through the checked server endpoint. An old class cannot reset credentials for a student who is now active elsewhere. Existing class-owned records cannot be moved between classes by changing block_id. Linked teams, projects, sessions and poster versions must have consistent ownership.

The administrator table and teacher membership/profile tables are not writable through ordinary authenticated table access. Teacher creation sets a teacher role, not administrator privileges. Provisioning failure deletes only the account just created; existing accounts/passwords are never overwritten by the create action. If Auth cleanup itself fails, the endpoint reports that an unassigned account remains for administrator attention.

## Explicit v1 limits

- A student has one active class context at a time, matching the existing student portal. Concurrent enrolment in multiple active classes/courses is rejected; supporting that needs a student class selector and explicit context throughout the student RPCs. Planned/archived rosters can retain the same student.
- Anonymous legacy activity/Find My Team flows cannot pick a random class when several classes are active. The implicit default returns null; use the authenticated student portal and teacher-distributed accounts.
- The current UI retains the NIT3004 curriculum. Class content/curriculum is reused by the existing schedule-generation controls; this change does not add a template authoring system, cross-class aggregate analytics or read-only supervisor roles.
- Teachers appear in one row each, with class editing, enable/disable, password reset and deletion actions. Administrator reset issues a temporary password and requires a new password on next login; disabled teachers must be enabled first. Reset/delete cannot target the caller or a platform administrator. Delete disables access first, then removes the Auth account and cascading profile/memberships. If historical references prevent deletion, the account remains disabled and the error is shown; historical class records are retained. Temporary credentials are displayed only until dismissed. No additional SQL migration is needed for these actions.
- Production Auth account creation/password changes have not been tested against the live Supabase project. Unit tests mock that transport; browser tests use synthetic Auth transport and real isolated PostgreSQL/React.

## Reproducible verification

`npm test` compiles the changed API handlers and runs the existing intake regressions plus class/account API scope tests. `npm run build` checks the frontend and production bundle.

Install PGlite outside the repository or provide its module path, then run from the repository root:

```sh
S10_PGLITE_MODULE=/path/to/pglite/dist/index.js node --test tests/classes/isolation.test.mjs
S10_PGLITE_MODULE=/path/to/pglite/dist/index.js S10_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs S10_CHROMIUM_EXECUTABLE=/path/to/chromium node tests/classes/browser.mjs
```

The isolated fixture loads the existing migration chain and the new migration, with synthetic Auth identities and no production URL/credentials. Tests cover independent concurrent classes, direct RLS access, teacher RPC denial, credential boundaries, revocation/disable, student context, parent consistency, immutable ownership, bootstrap ambiguity and migration idempotence. Browser coverage exercises class creation, teacher distribution, credential dismissal, reassignment, narrow layout, first-password form submission and a teacher importing a student CSV into their sole assigned class. Class labels and exported CSV filenames include the class code; the old roster-side singleton Block creation/lifecycle controls are replaced by central administrator management.
