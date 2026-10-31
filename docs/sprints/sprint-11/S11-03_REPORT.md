# S11-03 — Public classroom onboarding

Approved by Joseph on 1 November 2026; based on main b098b353492c273004ca496cdbf7c0f1e1855dd7.

## Change

The public home page now leads with “Make progress. Show your work.” and explains the classroom routine before the course overview. Attendance and progress are explicitly separate. First-login guidance matches StudentAccess: teacher-provided Student ID/password, personal password activation when prompted, waiting for team allocation and teacher help. Form and AI conversation are described without technical mode labels; AI summaries require student review and do not automatically assign marks.

The existing colour/font identity and four-week journey remain. Week 2/3 subtitles describe learning activities rather than promise a fixed event timetable. The studio guide is weekday-independent and encourages early disclosure of difficulties. Deliverables defer to the actual assessment brief and submission instructions. The public health-status query and badge are removed.

## Scope

PublicLanding, Studio, Journey, Deliverables and scoped landing CSS only, plus Sprint/roadmap documentation. No database, authentication, provider, student-record or assessment functionality changes. Assessment Assistant stays independent.

## Validation

- Production build: PASS (TypeScript + Vite). Existing large-bundle warning remains.
- Diff review: public landing health request removed; student/teacher paths unchanged; CSS scoped to landing elements.
- Desktop/mobile browser validation pending: cloud browser cannot reach the local preview. Local browser installation failed because the downloaded archive was invalid. Do not interpret build success as visual acceptance.
- No production database/account action or paid model calls.

## Release

Focused Draft PR for review. Not merged or production deployed by this task.
