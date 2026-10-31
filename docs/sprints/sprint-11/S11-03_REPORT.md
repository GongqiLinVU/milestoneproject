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


## Session visibility refinement

Joseph approved expanding only teacher-opened Sessions, with previous/upcoming groups collapsed. Both legacy Work Track and Intake layouts now follow classroom status, independent of intake availability. No open classroom shows an explicit “No session is open right now” message; it no longer promotes a scheduled, closed or catch-up Session to Current. Multiple open classrooms remain visible. Existing read-only history and collapsed catch-up entry points are preserved, with catch-up excluded from the duplicate previous list. No server eligibility or submission rules change. Build/diff verification performed; authenticated visual acceptance remains pending.


## In-session attendance

Joseph reported students missed the page-level attendance badge. Check-in is now inside each open session card in both legacy and Intake layouts, using the existing authenticated check_in_to_studio_session RPC with that card’s session ID. Success displays the saved timestamp in place and refreshes journey data; failures preserve a retry button with an inline error. Closed/scheduled sessions have no check-in action. The redundant page-level badge is removed. “Your session journey” and its paragraph become a compact Sessions heading with a question-mark modal. No permissions, schema or progress-submission rules change. Build/diff checks performed; live authenticated attendance writes and visual acceptance not exercised.

Attendance component server-render checks passed for open, closed, scheduled and already-checked-in fixtures: only open/unrecorded renders a check-in button; confirmed attendance renders the saved status. These checks make no network/database calls and do not validate live RPC success/failure or browser interaction.


## Check-in visual feedback

Joseph requested the original blue attention treatment inside the Session card. Unrecorded/open attendance uses the platform blue with the existing pulse slowed to 2.8 seconds. Submitting disables animation; completed attendance remains a static green timestamp. Reduced-motion preference disables pulsing. Production build/diff checks repeated; no live attendance writes.


## Persistent student shortcuts

Joseph requested removal of the oversized This Week introduction and “Complete only…” sentence. A fixed desktop column links to Sessions, Activities and My Project; smaller screens use a fixed bottom shortcut row with reserved content space. Activity/project shortcuts reveal the disclosure before navigating. Class identity remains as a small label. Weekly Activities gets a separate question-mark help dialog outside its disclosure summary. Build/diff checks repeated; browser visual and click acceptance remain pending.
