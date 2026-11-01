# S11-05 — Enrol an existing student by Student ID

Approved by Joseph on 1 November 2026 after the shared Project Library release (PR #101, main `21ade0f`). No production SQL or account action is authorized merely by this document.

## Behaviour

Class roster → Add student now opens an exact-ID search. Existing matches show name, preferred name, email, prior class label and lifecycle, plus account status. Multiple historical profiles require choosing which record to copy; the system does not silently overwrite conflicting names/emails. A single profile is displayed for explicit confirmation. Lookup does not enrol automatically.

Enrol in this class creates only a current-class roster row, copying the chosen profile and leaving team/project unassigned. The existing global student account, Auth identity, password, activation state, previous roster and submissions are unchanged. An accountless historical student can enrol and later use the existing Prepare account workflow. A disabled account stays disabled; the UI directs staff to an administrator.

No match opens the ordinary manual creation fields. An orphan account without a roster profile is disclosed as an existing account with details still required; no Auth details or credentials are returned. The form rechecks lookup before creation and uses INSERT rather than an overwrite/upsert. Team assignment stays separate.

Already enrolled returns an explicit status without changing the row. Another active class blocks lookup's confirmation path and the enrol RPC; no roster transfer, automatic archival or deletion occurs. Staff must resolve the original class/enrolment separately. Archived targets reject enrolment; planned targets also refuse a student who still has another active enrolment. This deliberately avoids creating a deferred transfer implicitly.

## Backend boundary

`lookup_student_for_enrolment(class_id, student_id)` and `enrol_existing_student(class_id, student_id, source_roster_id)` require `require_teaching_class` on the target before accessing records. Both use normalized full-ID equality, not fuzzy/wildcard/list search. Only the minimum matching profiles and account status cross the source-class read boundary; no Auth UID, password, project assignment or student evidence is returned. Anonymous users have no EXECUTE grant; students/unassigned teachers fail authorization. Direct roster RLS remains unchanged.

The enrol RPC repeats permission, class lifecycle, current enrolment and active-class conflict checks, verifies the source row still belongs to that exact Student ID, and uses the same transaction advisory lock as the existing active-class trigger. Source profiles are read with a row lock. It does not accept caller-supplied name/email/team/project for an existing-student enrolment. Repeated calls return already_enrolled.

## Files and local validation

- Additive migration: `supabase/migrations/20261101_sprint11_student_id_enrolment.sql`, copied exactly at the end of the installation snapshot.
- Native modal component: `src/StudentEnrolment.tsx`, integrated into `RosterManager`; existing Edit, CSV and account actions retained.
- Run `npm run test:student-enrolment`, `npm run test:project-library`, `npm test`, `npm run build`.
- Verified locally: **8/8 enrolment checks**, **10/10 shared-library/fresh-schema checks**, **248/248 Intake/API checks**, and TypeScript/Vite production build pass.
- Enrolment tests use local PGlite/Auth fixtures and cover exact normalized lookup, source choice, target authorization, account/profile preservation, repeat enrolment, mismatched sources, class activation between lookup/enrol, missing accounts, manual new profile, disabled accounts and archived targets. Migration is applied twice.
- Project-library tests include the complete fresh-schema installation and repeat shared-library migration; existing Intake/API regressions are retained.
- Browser layout, native-dialog interaction and hosted RPC acceptance remain pending. No paid provider, production database or Auth operation occurred during implementation.

## Rollout

Production and Preview share Supabase project `gwihaizxivclamzehupk`.

1. Review and execute **only** the new enrolment migration after the already-applied shared-library migration. Do not execute the complete schema on an existing database.
2. Deploy the matching frontend through the approved PR. The migration is additive and leaves the old Add student workflow functional until deployment.
3. In Class roster select 2B4 → Add student → enter an actual returning student's ID → review/select the source profile → Enrol in this class.
4. Verify one new roster row, no team/project allocation, the same account/login, and unchanged previous history. Assign the team/project separately; use the explicit NIT3003 project-continuation link where appropriate.

Read-only permission/installation verification:

```sql
select to_regprocedure('public.lookup_student_for_enrolment(uuid,text)'),
       to_regprocedure('public.enrol_existing_student(uuid,text,uuid)');
select has_function_privilege('anon','public.lookup_student_for_enrolment(uuid,text)','EXECUTE') as anon_lookup,
       has_function_privilege('anon','public.enrol_existing_student(uuid,text,uuid)','EXECUTE') as anon_enrol;
-- Both false. Hosted functional testing must use the actual teacher login;
-- a privileged SQL-editor session does not prove teacher RLS behaviour.
```

Recovery: the SQL transaction rolls back on error. If UI rollback is needed after deployment, restore the previous frontend; the additive RPCs can remain. If retiring the feature, revoke authenticated EXECUTE on these two functions before dropping them. Preserve any legitimate enrolment rows already created; do not delete student accounts or historical records as a rollback action.
