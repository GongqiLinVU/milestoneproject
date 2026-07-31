# Sprint 5 Handoff

**Status: Phase 1 merged; Phase 2 implemented in Draft PR**

## Production starting point

Use GitHub `main` as the source of truth. Sprint 4 closed through Phase 3 after
PR #35 merged at `9047090`.

The production platform already has:

- teaching blocks and private roster management
- formal teams, Project Catalogue and one project assignment per team
- private Student ID-based team lookup, to be retired after authenticated context
  replaces it
- Week 1 Check-in, to become the first-use Account Activation & Check-in flow
- Week 1–4 selection-first evidence
- private Teacher Review and Week 3–4 follow-up continuity
- teacher authentication and block-scoped operations

## Confirmed product decisions

- Remove Class Pulse from the active student and teacher experience.
- Remove Team Conversation from the active student and teacher experience.
- Preserve both activities' historical records; this is a UI/workflow retirement,
  not approved data deletion.
- Add student login.
- Do not offer open registration.
- Students use roster-prepared identities based on Student ID.
- Do not use a shared initial password.
- Week 1 Check-in becomes Account Activation & Check-in: unique initial
  credential, personal password setup, roster context confirmation and, only
  when no valid prior Check-in exists, a short Week 1 recovery check.
- Existing Week 1 Check-ins are linked by unique Student ID and are not
  resubmitted; ambiguous or invalid IDs go to teacher review rather than being
  matched by name.
- Login must automatically associate Student, Block, Team and Project and remove
  repeated identity fields from later activities.
- Remove standalone Find My Team once the authenticated My Project context is
  available; students must not complete both paths.
- The former Sprint 4 Phase 4–5 work moves into Sprint 5.
- The former AI-assisted teaching Sprint 5 becomes Sprint 6.

## First session scope

Implement only **Phase 1 — Activity cleanup and information architecture**.

Before changing code:

1. inspect latest `main`, open PRs and production status
2. find every Class Pulse and Team Conversation entry point, count, route, query,
   export and style dependency
3. propose the exact historical-data treatment and minimal student navigation
4. identify affected files and confirm that no migration is needed
5. implement a focused Draft PR after the scope is verified

Do not implement student authentication in the same PR.

## Phase 1 acceptance

- Class Pulse, Team Conversation and the standalone Find My Team entry disappear
  from current student navigation.
- Week 1 Check-in remains operational until Phase 2 replaces it with Account
  Activation & Check-in.
- The retired activities no longer appear as active teacher metrics or primary
  record navigation.
- Historical rows remain untouched.
- Other activity records, teacher login, exports and production build continue
  to work.
- Documentation clearly separates retired UI from retained historical data.

## Phase 1 implementation evidence

- Removed the Class Pulse student card and current teacher Activity Records
  selector, chart and aggregate CSV path.
- Removed both Find My Team links and the standalone route/component.
- Confirmed Team Conversation had already been retired from active student and
  teacher navigation in Sprint 3; Team Health Check remains current.
- Kept Week 1 Check-in operational.
- Kept `week1_pulse`, `team_conversations`, `find_student_team`, all historical
  migrations, grants and RLS policies unchanged.
- No database migration is required.
- `npm run build` passes locally. Vite reports only the existing bundle-size
  advisory.

## Authentication decision to prepare next

Phase 2 requires a short reviewed design before implementation. It must resolve:

- Student ID to Auth identity mapping
- unique activation credentials and delivery
- first-use Account Activation & Check-in sequence
- first-login personal password setup after unique credential verification
- roster-derived Name, Block, Team and Project confirmation
- password recovery
- roster import/provisioning lifecycle
- duplicate/cross-block identity
- RLS policy matrix
- legacy anonymous evidence association, including recognition of existing
  Week 1 Check-ins without requiring resubmission
- migration, verification and rollback

## Phase 2 implementation evidence

- Added server-only, teacher-authorised roster account provisioning.
- Added Student ID login translation, non-enumerating password recovery and
  persistent Supabase student sessions.
- Added Account Activation & Check-in with personal password setup,
  roster-derived context and legacy Check-in recognition.
- Added roster account statuses, pending count and one-time credential CSV.
- Added `student_accounts`, conservative Check-in linking, authenticated context
  RPCs and role-scoped RLS in an idempotent migration.
- Revoked the retired anonymous Find My Team RPC at Phase 2 rollout.
- Documented the security decision, role matrix, deployment and rollback.
- `npm run build` passes; the existing Vite bundle-size advisory remains.

## Reusable prompt for the new session

> Continue Engineering Studio Platform with Sprint 5. Use the connected GitHub
> App and latest `main` as the source of truth. Read `AI_CONTEXT.md`,
> `ROADMAP.md`, `docs/sprints/sprint-05/PLAN.md` and
> `docs/sprints/sprint-05/HANDOFF.md`. Reconcile documentation with merged PRs
> and production evidence. Start only Sprint 5 Phase 1: retire Class Pulse and
> Team Conversation from the active UI while preserving historical data, and
> confirm the minimal student information architecture. Report scope, affected
> files, migration impact, acceptance criteria and tests before implementation.
> Create one focused Draft PR and do not merge without my explicit approval.
