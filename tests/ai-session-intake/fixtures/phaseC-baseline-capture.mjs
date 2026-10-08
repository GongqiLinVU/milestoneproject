// Phase C baseline capture. Replays the PRESERVED S9 baseline fixture's recorded
// provider candidates through the ACTUAL runtime logic (decideTurn /
// validateCandidates / buildFallbackStudentRecord) plus the CURRENT UI review
// composition (as implemented in src/main.tsx at the baseline commit), to record
// the exact before-state (final record + route decisions). No provider calls.
//
// Run against .test-build (produced by `npm run test:build`).
import { readFileSync } from 'node:fs';
import { decideTurn } from '../../../.test-build/intakeHarness.js';
import { shouldReviewAcceptedAction, uiReviewDecision, questionCount, MAX_INTAKE_QUESTIONS } from '../../../.test-build/intakePolicy.js';
import { buildFallbackStudentRecord } from '../../../.test-build/aiSessionIntake.js';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/session-intake-debug-S9-phaseC-baseline.json', import.meta.url), 'utf8'));

// Reconstruct the per-turn conversation + answersSnapshot exactly as the client
// sent them (recorded in events[].request), and replay the recorded rawCandidate.
function replayTurn(ev) {
  const conversation = ev.request.conversation.map((t, i) => ({
    actor: t.actor, purpose: i % 2 ? 'student response' : 'system', text: t.text,
  }));
  const answers = ev.request.answersSnapshot;
  const candidate = ev.response.rawCandidate;
  const decision = decideTurn(candidate, conversation, answers);
  // LEGACY UI composition (before Failure 3 fix): recomputed review from the
  // model's self-reported assessment, overriding the backend.
  const nextAnswers = decision.answers;
  const questionLimitReached = questionCount(conversation) >= MAX_INTAKE_QUESTIONS;
  const acceptedActionReady = shouldReviewAcceptedAction(candidate.assessment || {}, candidate.evidenceUpdates || [], conversation);
  const legacyUiReview = decision.readyForReview || decision.route === 'review' || acceptedActionReady || questionLimitReached;
  const legacyUiReason = questionLimitReached ? 'question_limit_reached'
    : acceptedActionReady && !decision.readyForReview ? 'accepted_action_ui_override'
    : decision.routeDecision?.reason || 'server_review_decision';
  // FIXED UI decision (after Failure 3 fix): single authority — defers to backend.
  const fixed = uiReviewDecision({ readyForReview: decision.readyForReview, route: decision.route, routeDecision: decision.routeDecision }, conversation);
  return { conversation, answers, decision, nextAnswers,
    uiReview: legacyUiReview, uiReason: legacyUiReason, acceptedActionReady,
    fixedUiReview: fixed.review, fixedUiReason: fixed.reason };
}

const turns = fixture.events.filter(e => e.mode === 'turn');
const t1 = replayTurn(turns[0]);
const t2 = replayTurn(turns[1]);

// Final answers after both turns, as the live client accumulates them: turn 2's
// request.answersSnapshot already reflects turn 1's accepted updates; the final
// record is built from turn 2's resulting answers.
const finalAnswers = t2.decision.answers;
const finalRecord = buildFallbackStudentRecord(finalAnswers, {}, false);

const out = {
  label: 'PHASE C BASELINE (current runtime + current UI composition)',
  turn1: {
    backendRoute: t1.decision.routeDecision,
    backendReadyForReview: t1.decision.readyForReview,
    uiReview: t1.uiReview, uiReason: t1.uiReason,
    fieldDecisions: t1.decision.decisions.map(d => ({ field: d.field, outcome: d.outcome, reason: d.reason })),
    answersAfter: {
      testingStatus: t1.decision.answers.testingStatus,
      testingMethod: t1.decision.answers.testingMethod,
      testingResult: t1.decision.answers.testingResult,
      verificationMethod: t1.decision.answers.verificationMethod,
    },
  },
  turn2: {
    backendRoute: t2.decision.routeDecision,
    backendReadyForReview: t2.decision.readyForReview,
    uiReview: t2.uiReview, uiReason: t2.uiReason,
    fieldDecisions: t2.decision.decisions.map(d => ({ field: d.field, outcome: d.outcome, reason: d.reason })),
    nextAction: { action: t2.decision.answers.nextAction, expectedEvidence: t2.decision.answers.expectedEvidence },
  },
  finalRecord: {
    testing: finalRecord.testing,
    next_action: finalRecord.next_action,
    evidence: finalRecord.evidence,
    claims: finalRecord.claims,
  },
  dualAuthorityDivergence: {
    turn2BackendFinalRoute: t2.decision.routeDecision.final,
    turn2BackendReadyForReview: t2.decision.readyForReview,
    legacy_turn2UiReview: t2.uiReview,
    legacy_turn2UiReason: t2.uiReason,
    legacy_diverged: (t2.decision.readyForReview || t2.decision.route === 'review') !== t2.uiReview,
    fixed_turn2UiReview: t2.fixedUiReview,
    fixed_turn2UiReason: t2.fixedUiReason,
    fixed_diverged: (t2.decision.readyForReview || t2.decision.route === 'review') !== t2.fixedUiReview,
  },
};
console.log(JSON.stringify(out, null, 2));
