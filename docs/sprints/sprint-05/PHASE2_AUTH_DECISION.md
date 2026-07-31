# Sprint 5 Phase 2 — Student Authentication Decision

## Identity and lifecycle

- Student ID is the stable platform key. Supabase Auth uses the roster VU email;
  the login endpoint resolves Student ID server-side without exposing roster data.
- Teachers explicitly prepare only missing accounts. Each receives a
  cryptographically random initial password, returned once in a CSV download.
- Initial passwords are never stored in application tables. Re-running
  provisioning does not reset or redisplay an existing account.
- First login requires a personal password. Activation then links one matching
  legacy Check-in, or creates a short recovery Check-in from roster context.
- Recovery accepts Student ID and always returns the same response; instructions
  go only to the Auth email already sourced from the roster.
- One account is reused when a Student ID enrols in a later block. Archived
  blocks and evidence are retained. More than one active block match is rejected.
- Removing a roster row does not silently delete Auth identity or evidence.

## Security boundary

The service-role key exists only in the three Vercel endpoints. Provisioning
also verifies the caller's Supabase JWT contains `app_metadata.role=teacher`.
The browser uses only the publishable key.

| Actor | Accounts | Own context | Roster/other students | Teacher data |
|---|---|---|---|---|
| Anonymous | None | None | None | None |
| Authenticated student | Own account row | One active context | None | None |
| Authenticated non-teacher | Only a matching student account | Matching context only | None | None |
| Teacher | Manage account status | Teacher tools | Manage roster | Existing access |

## Deployment order

1. Set `SUPABASE_SERVICE_ROLE_KEY` in Preview and Production server environments.
2. Apply `20260731_sprint5_phase2_student_auth.sql`.
3. Run its verification checks.
4. Deploy endpoints and frontend.
5. Prepare a small test roster batch, activate one old-Check-in and one new
   student, then verify student/teacher RLS.

Rollback restores anonymous `find_student_team` execute permission before the
old frontend is restored. Do not drop linked identity data after real activation.
