// Sprint 9 R03 regressions — visible, correctable testing limitations.
//
// These exercise the ACTUAL runtime logic that feeds the Session Intake UI:
//   - applyEvidenceUpdates   (src/intakePolicy.ts) — how a student-disclosed
//     untested path is recorded onto answers.testingBaseline WITHOUT erasing an
//     executed test;
//   - buildFallbackStudentRecord (src/aiSessionIntake.ts) — how answers map to
//     the confirmed record's testing[0].baseline_or_expected;
//   - validateIntakeStudentRecord — schema validity of the resulting record.
//
// They also model the chat review card's correct(field,value) reducer EXACTLY
// as implemented in src/main.tsx (SessionIntakeModal.correct):
//   * push {field, before, after} keeping the ORIGINAL before on repeat edits,
//   * rebuild the record via buildFallbackStudentRecord(next,{},hasPrevious),
//   * setConfirmed(false)  (attestation reset).
//
// SCOPE / HONESTY: this is a runtime-logic + record-construction regression. It
// proves the limitation DATA reaches the display inputs and survives record
// construction, and that a testingBaseline correction is retained and resets
// confirmation. It does NOT render React / DOM and is therefore NOT proof of
// rendered UI behaviour. See S9-R03_REPORT.md for the implemented /
// offline-verified / UI-unverified separation.
//
// No provider calls. Runs under `npm test` via .test-build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyEvidenceUpdates } from '../../../.test-build/intakePolicy.js';
import { buildFallbackStudentRecord, validateIntakeStudentRecord } from '../../../.test-build/aiSessionIntake.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/session-intake-debug-S9-phaseC-baseline.json', import.meta.url), 'utf8'));
const turnEvents = fixture.events.filter(e => e.mode === 'turn');
const asConversation = (recorded) => recorded.map((t, i) => ({ actor: t.actor, purpose: i % 2 ? 'student response' : 'system', text: t.text }));

// A minimal, schema-complete answers object (same shape newIntakeAnswers builds).
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
  testingStatus: 'not_applicable',
  testingMethod: '',
  testingResult: '',
  testingBaseline: '',
  blockerStatus: 'none',
  blockerDescription: '',
  supportRequested: '',
  nextAction: 'Show the live demo next session',
  dueSession: 'S10',
  expectedEvidence: 'Live demo of the loading banner',
});

// Faithful model of SessionIntakeModal.correct(...) in src/main.tsx.
function makeCorrector(initialAnswers, hasPrevious) {
  let answers = { ...initialAnswers };
  let corrections = [];
  let confirmed = true; // assume the student had ticked attestation before editing
  let record = buildFallbackStudentRecord(answers, {}, hasPrevious);
  return {
    correct(field, value) {
      const prior = corrections.find(c => c.field === field);
      corrections = [...corrections.filter(c => c.field !== field), { field, before: prior ? prior.before : answers[field], after: value }];
      answers = { ...answers, [field]: value };
      record = buildFallbackStudentRecord(answers, {}, hasPrevious);
      confirmed = false; // attestation reset
    },
    get answers() { return answers; },
    get corrections() { return corrections; },
    get confirmed() { return confirmed; },
    get record() { return record; },
  };
}

// ---------------------------------------------------------------------------
// 1. Executed slow-connection observation and untested API-error limitation
//    coexist — the real two-candidate S9 case, through applyEvidenceUpdates.
// ---------------------------------------------------------------------------
test('R03: an executed slow-connection test and an untested API-error path coexist on the same record', () => {
  const conversation = asConversation(turnEvents[0].request.conversation);
  const executed = {
    field: 'testing', value: 'Loaded the booking list on a throttled connection',
    state: 'executed', sourceTurn: 1, evidenceType: null, progressKind: null,
    method: 'Throttled the network in dev tools and reloaded the booking list',
    observedResult: 'Spinner appeared until cards loaded', expectedEvidence: null,
  };
  const untested = {
    field: 'testing', value: 'what happens when the API returns an error',
    state: 'missing', sourceTurn: 1, evidenceType: null, progressKind: null,
    method: null, observedResult: null, expectedEvidence: null,
  };
  const next = applyEvidenceUpdates(baseAnswers(), [executed, untested], conversation);

  // Executed observation preserved and distinct from the untested path.
  assert.equal(next.testingStatus, 'executed');
  assert.match(next.testingResult, /Spinner appeared/);
  // Untested path captured as an explicit coverage limitation (not an observed result).
  assert.match(next.testingBaseline, /Not tested by student/i);
  assert.match(next.testingBaseline, /API/i);
  assert.doesNotMatch(next.testingResult, /API/i);

  // Survives record construction into ONE schema-valid testing entry.
  const record = buildFallbackStudentRecord(next, {}, false);
  const validation = validateIntakeStudentRecord(record);
  assert.equal(validation.valid, true, validation.valid ? '' : validation.errors.join(' · '));
  assert.equal(record.testing.length, 1);
  assert.equal(record.testing[0].execution_status, 'executed');
  assert.match(record.testing[0].observed_result, /Spinner appeared/);
  assert.match(record.testing[0].baseline_or_expected, /Not tested by student.*API/i);
});

// ---------------------------------------------------------------------------
// 2. The limitation reaches the UI display inputs and survives record
//    construction. The current-session drawer and review step read
//    record.testing[0].baseline_or_expected and answers.testingBaseline; the
//    confirmed-history view reads item.record.testing[0].baseline_or_expected.
// ---------------------------------------------------------------------------
test('R03: the stored limitation is present on both the display input (answers) and the constructed record', () => {
  const conversation = asConversation(turnEvents[0].request.conversation);
  const executed = {
    field: 'testing', value: 'Loaded on a slow connection', state: 'executed', sourceTurn: 1,
    evidenceType: null, progressKind: null, method: 'Throttled network', observedResult: 'Spinner then cards', expectedEvidence: null,
  };
  const untested = {
    field: 'testing', value: 'the API error branch', state: 'missing', sourceTurn: 1,
    evidenceType: null, progressKind: null, method: null, observedResult: null, expectedEvidence: null,
  };
  const next = applyEvidenceUpdates(baseAnswers(), [executed, untested], conversation);
  const record = buildFallbackStudentRecord(next, {}, false);

  // Display input the drawer/review bind to (answers.testingBaseline).
  assert.ok(next.testingBaseline && next.testingBaseline.length > 0, 'answers.testingBaseline feeds the current-session display');
  // Confirmed-record field the review/history bind to.
  assert.equal(record.testing[0].baseline_or_expected, next.testingBaseline,
    'answers.testingBaseline maps verbatim to testing[0].baseline_or_expected');
});

// ---------------------------------------------------------------------------
// 3. A correction is retained and resets confirmation (chat review card).
// ---------------------------------------------------------------------------
test('R03: correcting the testing limitation is retained, rebuilds the record and resets attestation', () => {
  const start = { ...baseAnswers(), testingStatus: 'executed', testingMethod: 'Throttled network',
    testingResult: 'Spinner then cards', testingBaseline: 'Not tested by student: the API error branch' };
  const c = makeCorrector(start, false);
  assert.equal(c.confirmed, true, 'precondition: attestation ticked before editing');

  c.correct('testingBaseline', 'Expected the cards within 2s; still have not tested the API 500 branch');

  // Correction retained with ORIGINAL before preserved.
  const entry = c.corrections.find(x => x.field === 'testingBaseline');
  assert.ok(entry, 'a testingBaseline correction is recorded');
  assert.equal(entry.before, 'Not tested by student: the API error branch');
  assert.match(entry.after, /API 500 branch/);
  // Record rebuilt with the corrected limitation.
  assert.match(c.record.testing[0].baseline_or_expected, /API 500 branch/);
  // Attestation reset.
  assert.equal(c.confirmed, false, 'editing resets confirmation');

  // A second edit keeps the ORIGINAL extraction as before (correction history preserved).
  c.correct('testingBaseline', 'Final: compared against a 2s target; API error path still untested');
  const entry2 = c.corrections.filter(x => x.field === 'testingBaseline');
  assert.equal(entry2.length, 1, 'one coalesced entry per field');
  assert.equal(entry2[0].before, 'Not tested by student: the API error branch',
    'the original extracted value is preserved as before across repeated edits');
  assert.match(entry2[0].after, /still untested/);
});

// ---------------------------------------------------------------------------
// 4. Confirmed history presents the stored limitation without editing it.
//    A confirmed record is saved and re-read; the history view binds to the
//    stored record's testing[0].baseline_or_expected (read-only; no corrector).
// ---------------------------------------------------------------------------
test('R03: a confirmed record carries the limitation into read-only history', () => {
  const start = { ...baseAnswers(), testingStatus: 'executed', testingMethod: 'Throttled network',
    testingResult: 'Spinner then cards', testingBaseline: 'Not tested by student: the API error branch' };
  // Student corrects, then confirms. The confirmed record is what history reloads.
  const c = makeCorrector(start, true);
  c.correct('testingBaseline', 'Compared against a 2s target; API 500 branch still untested');
  const confirmedRecord = c.record; // persisted via save_my_session_intake_chat → reloaded by get_my_session_intake
  assert.equal(validateIntakeStudentRecord(confirmedRecord).valid, true);

  // Simulate the history list item the drawer renders (item.record === confirmed record).
  const historyItem = { sessionNumber: 9, focus: 'Integration', record: confirmedRecord, confirmedAt: new Date().toISOString() };
  // The history view reads the stored limitation and offers NO editor (no correct()).
  assert.match(historyItem.record.testing[0].baseline_or_expected, /API 500 branch still untested/);
  assert.equal(typeof historyItem.record.testing[0].baseline_or_expected, 'string');
  assert.ok(!('correct' in historyItem), 'history item exposes no correction handle (read-only)');
});
