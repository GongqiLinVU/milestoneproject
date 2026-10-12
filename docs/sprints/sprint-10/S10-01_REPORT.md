# S10-01 — S1–S9 Work Track and teacher collection guidance

13 October 2026. **Implemented review candidate; not applied or deployed.**
Joseph approved the plan and implementation, including short S1–S5 questions.
Baseline main checked: 6df9282220a3acf7bb2084368b0d187db66ecbfa.
Planning PR #70 is the base for this stacked feature PR.

## Behavior

- Existing classroom workflow offers Work Track in S1–S9. S1–S5 require
  responsibility, current progress (including no progress) and next action;
  evidence and blocker/help are optional. No completion percentage is generated.
- S6–S9 retain existing requirement assessment, calculated completion and
  Session-specific questions. S10 feedback/final presentation is unchanged.
- Teacher Task/Expected evidence and Work Track open/close controls cover S1–S9.
  Collection labels are Existing classroom workflow / Guided Form / AI
  Conversation; selected guidance explains submission windows and independent
  Check-in attendance. Stored mode enums and distinct schemas are retained.
- Work Track writes require the Block's selected classroom workflow as well as
  activated identity, roster Block, Session range and open Track window.
  Switching to Form/AI closes Work Track writes; existing Work Track history
  remains reachable in the student and teacher Intake views. Student history is
  read-only; no duplicate progress-reporting entry is introduced.
- Previous next action lookup now includes S1–S9 and labels it as previous evidence.
  Early fields do not prefill current progress from prior claims. Teacher display
  omits percentage verification for early records. Late teacher verification is
  still cleared on student updates.

## Validation

- Production build PASS; unchanged >500 kB bundle warning remains a P2 note.
- Existing Intake suite: **134/134 PASS**.
- Focused executable PostgreSQL contract check: **PASS**, one sequential test
  covering early/late save and reload, early shape/empty validation and metric
  stripping, prior action/absent completion, teacher read, verification reset,
  same-Block and cross-Block student isolation, closed/other-method/S10 refusal,
  and anon/non-teacher read gates. Actual migration bodies/RLS were executed in
  PGlite with synthetic dependency tables. Instructions in
  tests/session-work-track/README.md.
- Focused Chromium component smoke with the actual changed React components,
  actual SQL RPC bodies and an isolated local transport bridge: **PASS**:
  S1 fields → save → reload; S7 existing questions → save → reload (50% server
  completion); teacher reads both (early has no percentage-verification form);
  teacher selects Guided Form → student opens read-only Work Track history.
  The harness substituted RPC/table transport and the entry point; it did not
  exercise real login, hosted routing, full Supabase/PostgREST or email.
- Diff whitespace/content review PASS. No external provider calls or production
  data operations. Existing Sprint 9 login/authorization evidence is reused;
  this local component smoke is not hosted acceptance.

## Database and release sequence (requires separate authorization)

New file: supabase/migrations/20261013_sprint10_s01_work_track.sql.
The matching definitions are appended to supabase/schema.sql; all applied
migration files remain unchanged. This transaction replaces only three RPCs:
get_my_session_work_track, save_my_session_work_track, get_my_session_journey.
No table/column/index change, no row migration, no RLS-policy change, no history
rewrite. Existing authenticated grants/security-definer identity checks and empty
search_path are retained. Early save whitelists bounded string fields, stripping
forged completion/requirements; late calculation remains server-authoritative.

After PR review and explicit authorization:
1. Confirm target project gwihaizxivclamzehupk and installed Sprint 9 intake_mode.
   Preview and Production share this backend; apply once, not once per frontend.
2. Apply the **new** migration before deploying this frontend. Applying SQL first
   is compatible with the old frontend: S6–S9 continue, early buttons await new UI.
   Non-selected-method Work Track writes intentionally become refused immediately.
3. Deploy the reviewed frontend. Complete a short authorized synthetic S1 and S7
   hosted save/reload/teacher-read smoke; check selected guidance and history.
   Neither deployment nor hosted test writes has happened in this task.

Focused read-only post-apply queries:

```sql
select p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_my_session_work_track', 'save_my_session_work_track',
                   'get_my_session_journey');
-- Expect security definer, empty search_path, authenticated=true, anon=false.
-- Inspect pg_get_functiondef(p.oid) for S1–S9 range/early fields/mode gate;
-- actual authorized saved records, not HTTP 200 alone, prove hosted persistence.
```

Recovery: prefer reverting only the frontend while retaining compatible extended
RPCs and stored early records. If SQL rollback is necessary, explicitly review
restoring the three prior function bodies from the 20260813 migration; retain
all records (early records become inaccessible through its range-limited getter).
Do not execute the entire old migration as a blind rollback or delete early rows.

## Remaining work

Hosted acceptance/application/release pending. 2B3 CHECK support, synthetic
2B2→2B3 transitions, real 2B4 configuration and activation/recovery are S10-02;
full continuity acceptance is S10-03. No 2B3 or 2B4 created, timetable/roster
invented, paid AI call made or live AI quality accepted. Draft-sync, analytics
redesign, schema unification and additional questionnaire taxonomies remain deferred.
