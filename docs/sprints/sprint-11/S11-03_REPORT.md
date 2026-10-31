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


## Classroom presentation refinement

Joseph requested a shorter first-day teaching surface after reviewing the initial change. The main sequence is now session routine → delivery evidence → one four-week challenge. The former Journey and Studio sections are merged into four concrete weekly questions (scope, working flow, validation and handover), avoiding a second explanation of the session routine. First-login instructions move to a question-mark trigger opening a native modal dialog with labelled heading, Close button, Escape handling and browser-managed focus containment/return. Navigation follows the presentation order.

Production build and diff checks repeated. Visual and modal browser acceptance remain pending under the environment limits above; the Vercel Preview also requires Vercel authentication.


## Student My Project refinement

Joseph requested My Project collapsed by default after login. The existing details/summary styling now applies to every progress mode, rather than only AI Intake. The label and project title use separate rows with increased spacing, wrapped titles and a persistent expand chevron. Expanded content has a dividing line. No data or authentication behaviour changes. Build and diff checks pass; authenticated visual acceptance remains pending.


## Weekly Activities placement

Joseph approved Sessions first, Weekly Activities second (collapsed by default), My Project third. This sequence applies to all Block intake modes. Reuses the existing activity components and controls; removes the misleading available-weeks counter in favour of “View this week’s activities”. The weekly navigation anchor targets the visible disclosure rather than its hidden contents. Production build and diff checks pass; authenticated visual acceptance remains pending.
