// Sprint 8 Phase C regressions.
//
// These exercise the ACTUAL runtime logic (decideTurn / validateCandidates /
// applyEvidenceUpdates / buildFallbackStudentRecord) and the UI decision path
// (uiReviewDecision) against the PRESERVED S9 baseline fixture
// (session-intake-debug-S9-phaseC-baseline.json, byte-identical to the exported
// trace). They verify the three observed S9 failures are fixed as deterministic
// safeguards. Frozen-candidate replay here proves the DETERMINISTIC pipeline,
// NOT that live model extraction improved — see the Phase C report for the
// implemented / offline-verified / live-verified separation.
//
// No provider calls. Runs under `npm test` via .test-build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideTurn, validateCandidates } from '../../../.test-build/intakeHarness.js';
import { applyEvidenceUpdates, uiReviewDecision, questionCount, MAX_INTAKE_QUESTIONS } from '../../../.test-build/intakePolicy.js';
import { buildFallbackStudentRecord, validateIntakeStudentRecord } from '../../../.test-build/aiSessionIntake.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/session-intake-debug-S9-phaseC-baseline.json', import.meta.url), 'utf8'));
const turnEvents = fixture.events.filter(e => e.mode === 'turn');
const asConversation = (recorded) => recorded.map((t, i) => ({ actor: t.actor, purpose: i % 2 ? 'student response' : 'system', text: t.text }));
const turn = (i) => {
  const ev = turnEvents[i];
  return { conversation: asConversation(ev.request.conversation), answers: ev.request.answersSnapshot, candidate: ev.response.rawCandidate };
};

// The preserved fixture must stay byte-identical to the exported S9 trace.
test('Phase C: the S9 baseline fixture is preserved unchanged (shape + key facts)', () => {
  assert.equal(fixture.session.number, 9);
  assert.equal(fixture.stopReason, 'sufficient_information'); // the original (wrong) UI stop reason, kept as history
  assert.equal(turnEvents.length, 2);
  // Turn 1 student discloses the executed slow-connection test AND the untested API path.
  assert.match(turn(0).conversation[1].text, /slow\s+connection/i);
  assert.match(turn(0).conversation[1].text, /not\s+tested what happens when the API returns an error/i);
  // Turn 3 student commitment contains NO "commit"/"SHA" (that came from the assistant).
  assert.match(turn(1).conversation[3].text, /live demo/i);
  assert.doesNotMatch(turn(1).conversation[3].text, /commit|sha/i);
});

// --- Failure 1: the explicitly-untested API-error path is preserved alongside
// the executed slow-connection test, with no collapse to a single untested state.
test('Phase C F1: untested API path is recorded WITHOUT erasing the executed slow-connection test', () => {
  const { conversation, answers, candidate } = turn(0);
  const d = decideTurn(candidate, conversation, answers);

  // Executed test preserved verbatim.
  assert.equal(d.answers.testingStatus, 'executed');
  assert.match(d.answers.testingResult, /Spinner appeared until cards loaded/);
  assert.ok(d.answers.testingMethod.length > 0);

  // The untested API-error path is accepted (not rejected as state_not_allowed_for_field)
  // and recorded as an explicit coverage limitation, not as the testing state itself.
  const testingDecisions = d.decisions.filter(x => x.field === 'testing');
  assert.equal(testingDecisions.length, 2, 'both testing candidates are evaluated');
  assert.ok(testingDecisions.every(x => x.reason !== 'state_not_allowed_for_field'),
    'missing testing state is no longer rejected for being disallowed');
  assert.ok(testingDecisions.some(x => x.outcome === 'accepted'), 'at least the executed test is accepted');
  assert.match(d.answers.testingBaseline, /Not tested by student/i);
  assert.match(d.answers.testingBaseline, /API error/i);

  // The confirmed-record testing entry carries BOTH facts in one schema-valid entry.
  const record = buildFallbackStudentRecord(d.answers, {}, false);
  assert.equal(record.testing.length, 1);
  assert.equal(record.testing[0].execution_status, 'executed');
  assert.match(record.testing[0].observed_result, /Spinner appeared/);
  assert.match(record.testing[0].baseline_or_expected, /Not tested by student.*API error/i);
});

test('Phase C F1: a planned/future test still cannot overwrite an executed test (unchanged safeguard)', () => {
  const current = { ...turn(0).answers, testingStatus: 'executed', testingMethod: 'Slow network', testingResult: 'Spinner appeared' };
  const conversation = [
    { actor: 'system', purpose: 'q', text: 'What next?' },
    { actor: 'student', purpose: 'student response', text: 'Next session I will simulate an API 500 response.' },
  ];
  const planned = { field: 'testing', value: 'Simulate API 500 next session', state: 'planned', sourceTurn: 1, evidenceType: null, progressKind: null, method: 'Simulate 500', observedResult: null, expectedEvidence: null };
  const next = applyEvidenceUpdates(current, [planned], conversation);
  assert.equal(next.testingStatus, 'executed');
  assert.equal(next.testingResult, 'Spinner appeared');
});

// --- Failure 2: assistant proposals stay distinct from student commitments.
test('Phase C F2: assistant-originated "commit SHA" next_action is rejected as not semantically supported', () => {
  const { conversation, answers, candidate } = turn(1);
  const d = decideTurn(candidate, conversation, answers);
  const nextActionDecision = d.decisions.find(x => x.field === 'next_action');
  assert.ok(nextActionDecision, 'the next_action candidate is evaluated');
  assert.equal(nextActionDecision.outcome, 'rejected');
  assert.equal(nextActionDecision.reason, 'student_source_not_semantically_supported');
  // No unsupported "commit SHA" detail reaches the record.
  assert.doesNotMatch(d.answers.nextAction, /commit|sha/i);
  assert.doesNotMatch(d.answers.expectedEvidence, /commit|sha/i);
});

test('Phase C F2: a next_action the student DID state in their own words is still accepted', () => {
  // Same shape as the failure, but the student themself names the commit SHA.
  const conversation = [
    { actor: 'system', purpose: 'q', text: 'What is your next action?' },
    { actor: 'student', purpose: 'student response', text: 'I will fix the error state and reply here with the commit SHA next session.' },
  ];
  const candidate = {
    assistantMessage: 'Noted — I will expect the commit SHA.',
    route: 'clarification', readyForReview: false,
    assessment: { evidenceReadiness: 'identified', verificationReadiness: 'clear', actionability: 'clear' },
    evidenceUpdates: [{ field: 'next_action', value: 'Fix the error state and provide the commit SHA next session', state: 'planned', sourceTurn: 1, evidenceType: null, progressKind: null, method: null, observedResult: null, expectedEvidence: 'commit SHA for the fix' }],
  };
  const d = decideTurn(candidate, conversation, { ...turn(1).answers, nextAction: '', expectedEvidence: '' });
  const nextActionDecision = d.decisions.find(x => x.field === 'next_action');
  assert.equal(nextActionDecision.outcome, 'accepted', 'student-stated commit SHA is supported and accepted');
  assert.match(d.answers.nextAction, /commit SHA/i);
});

test('Phase C F2 (unit): unsupported artifact rejection does not fire when the student used the term', () => {
  const conversation = [
    { actor: 'system', purpose: 'q', text: 'Verification?' },
    { actor: 'student', purpose: 'student response', text: 'I uploaded a screenshot of the error banner.' },
  ];
  const supported = { field: 'evidence', value: 'Screenshot of the error banner', state: 'available', sourceTurn: 1, evidenceType: 'documentation', progressKind: null, method: null, observedResult: null, expectedEvidence: null };
  const d = validateCandidates([supported], conversation, { ...turn(0).answers });
  assert.equal(d.decisions[0].outcome, 'accepted');
});

// --- Failure 3: the UI defers to the backend's single authoritative decision.
test('Phase C F3: UI review decision agrees with the backend (no accepted_action_ui_override)', () => {
  const { conversation, answers, candidate } = turn(1);
  const d = decideTurn(candidate, conversation, answers);

  // Backend authority: continue, not review (verification is not established).
  assert.equal(d.route, 'continue');
  assert.equal(d.readyForReview, false);

  // UI defers: same verdict, same single authority.
  const ui = uiReviewDecision({ readyForReview: d.readyForReview, route: d.route, routeDecision: d.routeDecision }, conversation);
  assert.equal(ui.review, false, 'UI must not force review when the backend says continue');
  assert.equal(ui.source, 'backend');
  assert.notEqual(ui.reason, 'accepted_action_ui_override');
  // Divergence is gone: backend review verdict === UI review verdict.
  assert.equal(d.readyForReview || d.route === 'review', ui.review);
});

test('Phase C F3: UI still enters review when the BACKEND decides review (budget / established action)', () => {
  // Backend-driven review: question budget exhausted → decideTurn sets review.
  const pair = (i) => [{ actor: 'system', purpose: 'clarification', text: `Q${i}` }, { actor: 'student', purpose: 'student response', text: `A${i}` }];
  const full = Array.from({ length: MAX_INTAKE_QUESTIONS }, (_, i) => pair(i)).flat();
  assert.equal(questionCount(full), MAX_INTAKE_QUESTIONS);
  const d = decideTurn({ assistantMessage: 'ok', route: 'continue', readyForReview: false, evidenceUpdates: [] }, full, turn(0).answers);
  assert.equal(d.readyForReview, true, 'backend forces review at the budget limit');
  const ui = uiReviewDecision({ readyForReview: d.readyForReview, route: d.route, routeDecision: d.routeDecision }, full);
  assert.equal(ui.review, true);
  assert.equal(ui.reason, 'question_limit_reached');
});

// =====================================================================
// Phase C FOLLOW-UP (Failure 2 specificity): unsupported "500" and
// "throttled network" must not appear in the accumulated/final record,
// while supported content and a supported paraphrase are preserved.
// =====================================================================

test('Phase C follow-up: unsupported "500" is absent from the accumulated and final record', () => {
  const { conversation, answers, candidate } = turn(0);
  const d = decideTurn(candidate, conversation, answers);
  // Accumulated answers carry the untested-API disclosure WITHOUT the model's "500".
  assert.match(d.answers.testingBaseline, /Not tested by student/i);
  assert.match(d.answers.testingBaseline, /API error/i);
  assert.doesNotMatch(d.answers.testingBaseline, /\b500\b/);
  // Final record (all testing-bound text) contains no unsupported "500".
  const record = buildFallbackStudentRecord(d.answers, {}, false);
  const testingText = JSON.stringify(record.testing[0]);
  assert.doesNotMatch(testingText, /\b500\b/);
  // The student never said "500" in the sourced turn.
  assert.doesNotMatch(conversation[1].text, /\b500\b/);
});

test('Phase C follow-up: "slow connection" does not become an asserted throttling procedure', () => {
  const { conversation, answers, candidate } = turn(0);
  const d = decideTurn(candidate, conversation, answers);
  const record = buildFallbackStudentRecord(d.answers, {}, false);
  // The recorded method must not assert the model paraphrase "throttled network".
  assert.doesNotMatch(record.testing[0].method, /throttl/i);
  // It must reflect the student's own disclosed condition.
  assert.match(record.testing[0].method, /slow connection/i);
  // The student used "slow connection", never "throttl*".
  assert.match(conversation[1].text, /slow\s+connection/i);
  assert.doesNotMatch(conversation[1].text, /throttl/i);
});

test('Phase C follow-up: both the executed test and the untested API-error path remain present and distinct', () => {
  const { conversation, answers, candidate } = turn(0);
  const d = decideTurn(candidate, conversation, answers);
  const record = buildFallbackStudentRecord(d.answers, {}, false);
  const t = record.testing[0];
  // Executed observation present.
  assert.equal(t.execution_status, 'executed');
  assert.match(t.observed_result, /Spinner appeared/i);
  // Untested API-error limitation present, in a DISTINCT field (not the status/result).
  assert.match(t.baseline_or_expected, /Not tested by student.*API error/i);
  assert.notEqual(t.execution_status, 'not_applicable');
});

test('Phase C follow-up: a student-stated number is kept (number stripping is source-grounded, not blanket)', () => {
  const conversation = [
    { actor: 'system', purpose: 'q', text: 'What did you test?' },
    { actor: 'student', purpose: 'student response', text: 'I simulated a 500 error response and the error banner appeared.' },
  ];
  const executed = { field: 'testing', value: 'Simulated 500 error', state: 'executed', sourceTurn: 1, evidenceType: 'test_result', progressKind: null, method: 'simulated a 500 error response', observedResult: 'error banner appeared', expectedEvidence: null };
  const d = validateCandidates([executed], conversation, { ...turn(0).answers, testingStatus: 'unknown' });
  assert.equal(d.decisions[0].outcome, 'accepted');
  // The student themself stated "500", so it is preserved.
  assert.match(d.answers.testingMethod, /500/);
});

test('Phase C follow-up: a supported equivalent paraphrase is not incorrectly rejected or stripped', () => {
  // Student says "throttled the network" themselves → method may keep "throttled".
  const conversation = [
    { actor: 'system', purpose: 'q', text: 'How did you test?' },
    { actor: 'student', purpose: 'student response', text: 'I throttled the network in dev tools and the spinner appeared until cards loaded.' },
  ];
  const executed = { field: 'testing', value: 'throttled network test', state: 'executed', sourceTurn: 1, evidenceType: 'test_result', progressKind: null, method: 'throttled the network', observedResult: 'spinner appeared until cards loaded', expectedEvidence: null };
  const d = validateCandidates([executed], conversation, { ...turn(0).answers, testingStatus: 'unknown' });
  assert.equal(d.decisions[0].outcome, 'accepted', 'a student-supported method is accepted');
  assert.match(d.answers.testingMethod, /throttl/i, 'student-stated "throttled" is preserved, not stripped');

  // Separately: evidence/observed paraphrase that only varies morphologically
  // ("loaded"→"load", "appeared"→"showed") is NOT stripped (known limitation:
  // non-method free text keeps the model wording).
  const conv2 = [
    { actor: 'system', purpose: 'q', text: 'q' },
    { actor: 'student', purpose: 'student response', text: 'When I loaded the page over a slow connection, the spinner appeared until the cards loaded.' },
  ];
  const ev = { field: 'evidence', value: 'Manual load over a slow connection showed the spinner until cards loaded', state: 'available', sourceTurn: 1, evidenceType: 'live_demonstration', progressKind: null, method: null, observedResult: null, expectedEvidence: null };
  const d2 = validateCandidates([ev], conv2, { ...turn(0).answers });
  assert.equal(d2.decisions[0].outcome, 'accepted');
  assert.equal(d2.answers.evidenceReference, 'Manual load over a slow connection showed the spinner until cards loaded');
});

test('Phase C follow-up: the authoritative backend/UI review decision is preserved (still continue, no divergence)', () => {
  const t2 = turn(1);
  const d = decideTurn(t2.candidate, t2.conversation, t2.answers);
  assert.equal(d.route, 'continue');
  assert.equal(d.readyForReview, false);
  const ui = uiReviewDecision({ readyForReview: d.readyForReview, route: d.route, routeDecision: d.routeDecision }, t2.conversation);
  assert.equal(ui.review, false);
  assert.notEqual(ui.reason, 'accepted_action_ui_override');
  assert.equal(d.readyForReview || d.route === 'review', ui.review);
});

// Phase C follow-up (publish review): number stripping must only remove a BARE,
// free-standing unsupported number (the illustrative "500"), NOT digits inside a
// structured token (version / date / filename / path / identifier / unit), which
// may carry a student-disclosed fact.
test('Phase C follow-up: structured tokens (version, date, filename) survive number stripping', () => {
  const current = { ...turn(0).answers };
  // Version in a grounded evidence reference — digits must be preserved.
  const convVer = [
    { actor: 'system', purpose: 'q', text: 'What changed?' },
    { actor: 'student', purpose: 'student response', text: 'I upgraded the parser library to the latest release.' },
  ];
  const ver = { field: 'evidence', value: 'Upgraded parser to v2.1.0', state: 'available', sourceTurn: 1, evidenceType: 'repository_change', progressKind: null, method: null, observedResult: null, expectedEvidence: null };
  const dVer = validateCandidates([ver], convVer, current);
  assert.equal(dVer.decisions[0].outcome, 'accepted');
  assert.equal(dVer.answers.evidenceReference, 'Upgraded parser to v2.1.0', 'version string must not be mangled');

  // Date the student states in an accepted next action — digits must be preserved.
  const convDate = [
    { actor: 'system', purpose: 'q', text: 'What next?' },
    { actor: 'student', purpose: 'student response', text: 'I will deploy the release on 2026-10-08 before the next session.' },
  ];
  const act = { field: 'next_action', value: 'Deploy the release on 2026-10-08', state: 'planned', sourceTurn: 1, evidenceType: null, progressKind: null, method: null, observedResult: null, expectedEvidence: null };
  const dDate = validateCandidates([act], convDate, { ...current, nextAction: '', expectedEvidence: '' });
  assert.equal(dDate.decisions[0].outcome, 'accepted');
  assert.match(dDate.answers.nextAction, /2026-10-08/, 'date must not be mangled');

  // Filename with an embedded digit — preserved.
  const convFile = [
    { actor: 'system', purpose: 'q', text: 'Evidence?' },
    { actor: 'student', purpose: 'student response', text: 'I added the migration file to the repository.' },
  ];
  const file = { field: 'evidence', value: 'Added migration report_v2.sql', state: 'available', sourceTurn: 1, evidenceType: 'repository_change', progressKind: null, method: null, observedResult: null, expectedEvidence: null };
  const dFile = validateCandidates([file], convFile, current);
  assert.equal(dFile.answers.evidenceReference, 'Added migration report_v2.sql', 'filename digit must not be mangled');

  // The targeted bare-number case still works: an illustrative "500" the student
  // never stated is still removed from the untested-path note (same S9 fixture).
  const { conversation, answers, candidate } = turn(0);
  const dS9 = decideTurn(candidate, conversation, answers);
  assert.doesNotMatch(dS9.answers.testingBaseline, /\b500\b/);
  assert.match(dS9.answers.testingBaseline, /API error/i);
});
