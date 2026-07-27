# Sprint 2 Production Verification

Run this checklist against the production Vercel site and production Supabase
project after the Phase 5 PR is merged. Record the date, tester and observed
result. Do not store passwords, tokens or student CSV files in GitHub.

## Build and deployment

- [ ] `npm run build` passes for the merged commit.
- [ ] Vercel production deployment is Ready for that commit.
- [ ] Landing page and `/admin` load without console errors.
- [ ] Production uses only `VITE_SUPABASE_URL` and the publishable key.

## Role and RLS matrix

Use an anonymous browser, an authenticated account without
`app_metadata.role = teacher`, and a teacher account.

| Operation | Anonymous | Non-teacher | Teacher |
|---|---:|---:|---:|
| Read protected activity rows | Denied | Denied | Allowed |
| Update identified activity row | Denied | Denied | Allowed |
| Delete identified activity row | Denied | Denied | Allowed |
| Update Peer Review setting | Denied | Denied | Allowed |
| Read safe Peer Review open/closed state | Allowed | Allowed | Allowed |

- [ ] The five checks above match both the UI and direct Supabase requests.
- [ ] Class Pulse has no row-level edit or delete control.
- [ ] No browser request contains a Supabase service-role key.

## Student constraints

- [ ] A duplicate Student Check-in Student ID is rejected.
- [ ] A duplicate Four-Week Action Plan Student ID is rejected.
- [ ] A second Team Conversation for the same team is rejected.
- [ ] Poster Review rejects the same from/to team.
- [ ] Poster Review rejects a duplicate reviewer Student ID/to-team pair.
- [ ] Student-facing failures use clear messages without raw database details.
- [ ] Existing create-once receipts remain visible in the submitting browser.

## Peer Review control

- [ ] Closed: student entry is disabled.
- [ ] Closed: a direct anonymous insert is rejected by RLS.
- [ ] Opened by teacher: valid student insert succeeds after refresh.
- [ ] Closed again: new inserts fail and existing reviews remain unchanged.
- [ ] Non-teacher cannot change the setting.

## CSV export

For each dashboard selector, load records and select **Export CSV**.

- [ ] Check-in headings and row count match the displayed activity.
- [ ] Team Conversation headings and row count match the displayed activity.
- [ ] Four-Week Action Plan headings and row count match the displayed activity.
- [ ] Poster Review headings and row count match the displayed activity.
- [ ] Class Pulse contains only Category, Response, Count and Percentage.
- [ ] Commas, quotes and line breaks open correctly in Excel or Numbers.
- [ ] A value beginning with `=`, `+`, `-` or `@` is not executed as a formula.
- [ ] Empty activities disable export and do not download an empty file.
- [ ] Signing out removes dashboard access and export access.

Delete locally downloaded student CSV files when testing is complete.

## Completion record

```text
Date:
Tester:
Production commit:
Vercel deployment:
Build: Pass / Fail
Role and RLS matrix: Pass / Fail
Student constraints: Pass / Fail
Peer Review control: Pass / Fail
CSV export: Pass / Fail
Issues:
Sprint 2 production verified: Yes / No
```
