# Sprint 2 Production Verification

Run this checklist against the production Vercel site and production Supabase
project after the Phase 5 PR is merged. Record the date, tester and observed
result. Do not store passwords, tokens or student CSV files in GitHub.

## Build and deployment

- [x] `npm run build` passes for the merged commit.
- [x] Vercel production deployment is Ready for that commit.
- [x] Landing page and `/admin` load without console errors.
- [x] Production uses only `VITE_SUPABASE_URL` and the publishable key.

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

- [x] The five checks above match both the UI and direct Supabase requests.
- [x] Class Pulse has no row-level edit or delete control.
- [x] No browser request contains a Supabase service-role key.

## Student constraints

- [x] A duplicate Student Check-in Student ID is rejected.
- [x] A duplicate Four-Week Action Plan Student ID is rejected.
- [x] A second Team Conversation for the same team is rejected.
- [x] Poster Review rejects the same from/to team.
- [x] Poster Review rejects a duplicate reviewer Student ID/to-team pair.
- [x] Student-facing failures use clear messages without raw database details.
- [x] Existing create-once receipts remain visible in the submitting browser.

## Peer Review control

- [x] Closed: student entry is disabled.
- [x] Closed: a direct anonymous insert is rejected by RLS.
- [x] Opened by teacher: valid student insert succeeds after refresh.
- [x] Closed again: new inserts fail and existing reviews remain unchanged.
- [x] Non-teacher cannot change the setting.

## CSV export

For each dashboard selector, load records and select **Export CSV**.

- [x] Check-in headings and row count match the displayed activity.
- [x] Team Conversation headings and row count match the displayed activity.
- [x] Four-Week Action Plan headings and row count match the displayed activity.
- [x] Poster Review headings and row count match the displayed activity.
- [x] Class Pulse contains only Category, Response, Count and Percentage.
- [x] Commas, quotes and line breaks open correctly in Excel or Numbers.
- [x] A value beginning with `=`, `+`, `-` or `@` is not executed as a formula.
- [x] Empty activities disable export and do not download an empty file.
- [x] Signing out removes dashboard access and export access.

Delete locally downloaded student CSV files when testing is complete.

## Completion record

\`\`\`text
Date: 2026-07-27
Tester: Joseph Lin
Production commit: d9aec47aa15d4c1c0f4e70ed744849f589f9023d
Vercel deployment: Ready
Build: Pass
Role and RLS matrix: Pass
Student constraints: Pass
Peer Review control: Pass
CSV export: Pass
Issues: None observed
Sprint 2 production verified: Yes
\`\`\`
