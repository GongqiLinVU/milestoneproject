// Sprint 9 R02 regressions — teacher Intake read workflow.
//
// WHAT THESE PROVE (offline):
//   * The confirmed student record the teacher panel reads is built by the ACTUAL
//     implementation (buildFallbackStudentRecord / validateIntakeStudentRecord)
//     and carries testing[0].baseline_or_expected verbatim into the exact shape
//     the StudioSessionControl Intake panel binds to.
//   * A faithful MODEL of the SQL function's row algebra
//     (public.get_teacher_session_intakes) — roster-base left join, submitted vs
//     missing, Block/Session filtering, and off-roster orphan preservation —
//     produces the submitted/missing counts and flags the panel expects.
//   * The client stale-response guard (intakeRequestRef key) drops a superseded
//     or session-mismatched response.
//
// WHAT THESE DO **NOT** PROVE:
//   * They do NOT prove the DEPLOYED SQL privileges, SECURITY DEFINER config,
//     search_path, is_teacher() enforcement, GRANT/REVOKE, or RLS. Those are
//     database facts that only the read-only audit script
//     (supabase/scripts/sprint9_r02_teacher_intake_read_audit.sql) can establish
//     against a real database. The non-teacher-rejection and authorization cases
//     here are MODELLED, not executed against Postgres.
//
// No provider calls, no database. Runs under `npm test` via .test-build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEvidenceUpdates } from '../../../.test-build/intakePolicy.js';
import { buildFallbackStudentRecord, validateIntakeStudentRecord } from '../../../.test-build/aiSessionIntake.js';

// ---- Shared helpers -------------------------------------------------------

const baseAnswers = () => ({
  responsibility: 'The booking portal availability banner',
  progress: 'Added a loading state to the booking list',
  progressKind: 'advanced',
  scope: 'Booking list loading banner only',
  completionPercent: 60,
  evidenceType: 'repository_change',
  evidenceAvailability: 'available_now',
  evidenceReference: 'PR #42 booking-loading-state',
  verificationMethod: 'Open the booking list on a throttled network and watch the spinner',
  testingStatus: 'executed',
  testingMethod: 'Throttled the network and reloaded the booking list',
  testingResult: 'Spinner appeared until cards loaded',
  testingBaseline: 'Not tested by student: the API error branch',
  blockerStatus: 'none',
  blockerDescription: '',
  supportRequested: '',
  nextAction: 'Show the live demo next session',
  dueSession: 'S10',
  expectedEvidence: 'Live demo of the loading banner',
});

// Faithful model of public.get_teacher_session_intakes row algebra. This mirrors
// the SQL: roster is the list base (left join to the confirmed intake on
// session_id + block_id + student_id), plus an orphan pass for confirmed intakes
// whose student is no longer on the roster. It is a CONTRACT MODEL, not the SQL.
function teacherSessionIntakes({ session, roster, intakes }) {
  if (!session) {
    return { sessionId: null, sessionNumber: null, blockId: null, rosterSize: 0, rosterSubmittedCount: 0, missingCount: 0, offRosterCount: 0, submittedCount: 0, intakes: [] };
  }
  const base = roster
    .filter(r => r.block_id === session.block_id)
    .map(r => {
      const intake = intakes.find(i =>
        i.session_id === session.id && i.block_id === session.block_id && i.student_id === r.student_id);
      return {
        studentId: r.student_id,
        studentName: r.preferred_name || r.full_name,
        teamName: `Team ${r.team_number}`,
        onRoster: true,
        submitted: Boolean(intake),
        intakeId: intake ? intake.id : null,
        studentRecord: intake ? intake.student_record : null,
        corrections: intake ? (intake.student_confirmation.corrections || []) : null,
        teacherVerification: { status: 'unset', recorded: false },
      };
    });
  const orphans = intakes
    .filter(i => i.session_id === session.id && i.block_id === session.block_id &&
      !roster.some(r => r.block_id === session.block_id && r.student_id === i.student_id))
    .map(i => ({
      studentId: i.student_id, studentName: i.student_id, teamName: null,
      onRoster: false, submitted: true, intakeId: i.id,
      studentRecord: i.student_record, corrections: i.student_confirmation.corrections || [],
      teacherVerification: { status: 'unset', recorded: false },
    }));
  const rosterSubmittedCount = base.filter(b => b.submitted).length;
  const missingCount = base.filter(b => !b.submitted).length;
  const offRosterCount = orphans.length;
  return { sessionId: session.id, sessionNumber: session.session_number, blockId: session.block_id,
    rosterSize: rosterSubmittedCount + missingCount,
    rosterSubmittedCount, missingCount, offRosterCount,
    submittedCount: rosterSubmittedCount + offRosterCount, // display-only grand total
    intakes: [...base, ...orphans] };
}

// Faithful model of the client stale-response guard (StudioSessionControl.openIntake).
function makeIntakeLoader() {
  let currentKey = '';
  let applied = null;
  return {
    open(blockId, sessionId) { currentKey = `${blockId}:${sessionId}`; return currentKey; },
    resolve(requestKey, payload, requestedSessionId) {
      if (currentKey !== requestKey) return; // superseded
      if (payload && payload.sessionId && payload.sessionId !== requestedSessionId) return; // mismatch
      applied = payload;
    },
    get applied() { return applied; },
  };
}

// ---------------------------------------------------------------------------
// 1. The confirmed record the teacher panel reads is REAL and preserves the
//    testing limitation into the exact field the panel binds to.
// ---------------------------------------------------------------------------
test('R02: a real confirmed record exposes testing[0].baseline_or_expected to the teacher panel', () => {
  const record = buildFallbackStudentRecord(baseAnswers(), {}, false);
  assert.equal(validateIntakeStudentRecord(record).valid, true);
  const testing = record.testing[0];
  // Executed observation and untested limitation stay distinct — the panel shows
  // "Executed testing" (status/method/observed) and "Untested limitation" (baseline).
  assert.equal(testing.execution_status, 'executed');
  assert.match(testing.observed_result, /Spinner appeared/);
  assert.match(testing.baseline_or_expected, /Not tested by student.*API error/i);
  // The panel reads record.testing?.[0]?.baseline_or_expected — present and a string.
  assert.equal(typeof testing.baseline_or_expected, 'string');
});

test('R02: an AI-appended untested path still reaches the teacher panel limitation field', () => {
  const conversation = [
    { actor: 'system', purpose: 'q', text: 'What did you test?' },
    { actor: 'student', purpose: 'student response', text: 'I ran it on a slow connection but have not tested the API error path.' },
  ];
  const executed = { field: 'testing', value: 'slow connection', state: 'executed', sourceTurn: 1, evidenceType: null, progressKind: null, method: 'Throttled network', observedResult: 'Spinner then cards', expectedEvidence: null };
  const untested = { field: 'testing', value: 'the API error path', state: 'missing', sourceTurn: 1, evidenceType: null, progressKind: null, method: null, observedResult: null, expectedEvidence: null };
  const next = applyEvidenceUpdates({ ...baseAnswers(), testingStatus: 'unknown', testingMethod: '', testingResult: '', testingBaseline: '' }, [executed, untested], conversation);
  const record = buildFallbackStudentRecord(next, {}, false);
  assert.match(record.testing[0].baseline_or_expected, /Not tested by student.*API error path/i);
});

// ---------------------------------------------------------------------------
// 2. Submitted / missing mapping and Block/Session filtering (SQL row-algebra model).
// ---------------------------------------------------------------------------
test('R02: roster is the list base; a student with no intake is MISSING', () => {
  const record = buildFallbackStudentRecord(baseAnswers(), {}, false);
  const session = { id: 'sess-9', block_id: 'blk-2B2', session_number: 9 };
  const roster = [
    { block_id: 'blk-2B2', student_id: 'S001', full_name: 'A One', preferred_name: null, team_number: 1 },
    { block_id: 'blk-2B2', student_id: 'S002', full_name: 'B Two', preferred_name: null, team_number: 1 },
  ];
  const intakes = [{ id: 'i1', session_id: 'sess-9', block_id: 'blk-2B2', student_id: 'S001', student_record: record, student_confirmation: { corrections: [] } }];
  const out = teacherSessionIntakes({ session, roster, intakes });
  assert.equal(out.submittedCount, 1);
  assert.equal(out.missingCount, 1);
  const missing = out.intakes.find(r => r.studentId === 'S002');
  assert.equal(missing.submitted, false);
  assert.equal(missing.studentRecord, null);
});

test('R02: an intake from another Block or another Session never attaches to this Session', () => {
  const record = buildFallbackStudentRecord(baseAnswers(), {}, false);
  const session = { id: 'sess-9', block_id: 'blk-2B2', session_number: 9 };
  const roster = [{ block_id: 'blk-2B2', student_id: 'S001', full_name: 'A One', preferred_name: null, team_number: 1 }];
  const intakes = [
    { id: 'other-block', session_id: 'sess-9', block_id: 'blk-OTHER', student_id: 'S001', student_record: record, student_confirmation: { corrections: [] } },
    { id: 'other-session', session_id: 'sess-8', block_id: 'blk-2B2', student_id: 'S001', student_record: record, student_confirmation: { corrections: [] } },
  ];
  const out = teacherSessionIntakes({ session, roster, intakes });
  assert.equal(out.submittedCount, 0, 'cross-block and cross-session intakes do not count');
  assert.equal(out.missingCount, 1);
  assert.equal(out.intakes[0].submitted, false);
});

// ---------------------------------------------------------------------------
// 3. Historical preservation: an off-roster confirmed intake is not dropped.
// ---------------------------------------------------------------------------
test('R02: a confirmed intake whose student left the roster is preserved as off-roster, not dropped', () => {
  const record = buildFallbackStudentRecord(baseAnswers(), {}, false);
  const session = { id: 'sess-9', block_id: 'blk-2B2', session_number: 9 };
  const roster = [{ block_id: 'blk-2B2', student_id: 'S001', full_name: 'A One', preferred_name: null, team_number: 1 }];
  const intakes = [
    { id: 'i1', session_id: 'sess-9', block_id: 'blk-2B2', student_id: 'S001', student_record: record, student_confirmation: { corrections: [] } },
    { id: 'i-gone', session_id: 'sess-9', block_id: 'blk-2B2', student_id: 'S999', student_record: record, student_confirmation: { corrections: [] } },
  ];
  const out = teacherSessionIntakes({ session, roster, intakes });
  const orphan = out.intakes.find(r => r.studentId === 'S999');
  assert.ok(orphan, 'off-roster confirmed intake is still returned');
  assert.equal(orphan.onRoster, false);
  assert.equal(orphan.submitted, true);
  // Roster completion is 1/1 — the off-roster record does NOT inflate it.
  assert.equal(out.rosterSize, 1, 'roster size counts only roster students');
  assert.equal(out.rosterSubmittedCount, 1, 'roster completion numerator excludes off-roster');
  assert.equal(out.missingCount, 0);
  // Off-roster history is reported separately.
  assert.equal(out.offRosterCount, 1, 'off-roster history is counted on its own');
  assert.equal(out.submittedCount, 2, 'display-only grand total includes off-roster');
});

test('R02: a roster completion rate computed from the separated counts is not inflated by off-roster history', () => {
  const record = buildFallbackStudentRecord(baseAnswers(), {}, false);
  const session = { id: 'sess-9', block_id: 'blk-2B2', session_number: 9 };
  // 2 roster students, only 1 submitted; plus 1 off-roster confirmed intake.
  const roster = [
    { block_id: 'blk-2B2', student_id: 'S001', full_name: 'A One', preferred_name: null, team_number: 1 },
    { block_id: 'blk-2B2', student_id: 'S002', full_name: 'B Two', preferred_name: null, team_number: 1 },
  ];
  const intakes = [
    { id: 'i1', session_id: 'sess-9', block_id: 'blk-2B2', student_id: 'S001', student_record: record, student_confirmation: { corrections: [] } },
    { id: 'i-gone', session_id: 'sess-9', block_id: 'blk-2B2', student_id: 'S999', student_record: record, student_confirmation: { corrections: [] } },
  ];
  const out = teacherSessionIntakes({ session, roster, intakes });
  // Correct roster completion is 1/2 = 50%, NOT 2/2 or 2/3.
  const rosterRate = out.rosterSubmittedCount / out.rosterSize;
  assert.equal(out.rosterSize, 2);
  assert.equal(out.rosterSubmittedCount, 1);
  assert.equal(rosterRate, 0.5);
  assert.equal(out.offRosterCount, 1);
});

test('R02: corrections and teacher-verification separation are carried per row', () => {
  const record = buildFallbackStudentRecord(baseAnswers(), {}, false);
  const session = { id: 'sess-9', block_id: 'blk-2B2', session_number: 9 };
  const roster = [{ block_id: 'blk-2B2', student_id: 'S001', full_name: 'A One', preferred_name: null, team_number: 1 }];
  const intakes = [{ id: 'i1', session_id: 'sess-9', block_id: 'blk-2B2', student_id: 'S001', student_record: record,
    student_confirmation: { corrections: [{ field: 'testingBaseline', before: 'x', after: 'y' }] } }];
  const out = teacherSessionIntakes({ session, roster, intakes });
  const row = out.intakes[0];
  assert.deepEqual(row.corrections, [{ field: 'testingBaseline', before: 'x', after: 'y' }]);
  assert.deepEqual(row.teacherVerification, { status: 'unset', recorded: false });
});

// ---------------------------------------------------------------------------
// 4. Non-teacher rejection — MODELLED (deployed enforcement is in SQL + audit).
// ---------------------------------------------------------------------------
test('R02 (modelled): the function contract rejects a non-teacher before returning rows', () => {
  // This asserts the DESIGNED contract, not the deployed privilege. The real
  // guard is `if not public.is_teacher() then raise ... 'Teacher access required'`.
  function guardedCall(isTeacher) {
    if (!isTeacher) throw new Error('Teacher access required');
    return teacherSessionIntakes({ session: { id: 's', block_id: 'b', session_number: 1 }, roster: [], intakes: [] });
  }
  assert.throws(() => guardedCall(false), /Teacher access required/);
  assert.doesNotThrow(() => guardedCall(true));
});

// ---------------------------------------------------------------------------
// 5. Client stale-response guard.
// ---------------------------------------------------------------------------
test('R02: a superseded intake response is dropped by the request guard', () => {
  const loader = makeIntakeLoader();
  const keyA = loader.open('blk-2B2', 'sess-9');
  const keyB = loader.open('blk-2B2', 'sess-8'); // teacher switched session
  loader.resolve(keyA, { sessionId: 'sess-9', intakes: [] }, 'sess-9'); // late response for A
  assert.equal(loader.applied, null, 'the superseded response for sess-9 is ignored');
  loader.resolve(keyB, { sessionId: 'sess-8', intakes: [] }, 'sess-8');
  assert.equal(loader.applied.sessionId, 'sess-8', 'only the current request is applied');
});

test('R02: a session-mismatched payload is ignored even for the current request', () => {
  const loader = makeIntakeLoader();
  const key = loader.open('blk-2B2', 'sess-9');
  loader.resolve(key, { sessionId: 'sess-OTHER', intakes: [] }, 'sess-9');
  assert.equal(loader.applied, null, 'a payload for a different session is not applied');
});
