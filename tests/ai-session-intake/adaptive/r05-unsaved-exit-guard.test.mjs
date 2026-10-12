// Sprint 9 R05 — focused tests for the Intake unsaved-exit guard logic.
//
// These exercise the testable seam (the pure dirty predicates + the process-wide
// registry/confirm gate). Rendered DOM wiring (the modal buttons routing through
// guardedClose, the shared beforeunload prompt firing in a real browser) is a
// browser-rehearsal item and is NOT claimed here — see S9-R05_REPORT.md. The
// predicates below are exactly the conditions those modals pass in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deterministicFormDirty,
  chatIntakeDirty,
  INTAKE_EXIT_CONFIRM_MESSAGE,
  registerUnsavedBlocker,
  anyUnsaved,
  confirmExitIfBlocked,
  __resetUnsavedBlockersForTest,
} from '../../../.test-build/intakeExitGuard.js';

// --- Deterministic Form dirtiness -------------------------------------------

const formClean = { saved: false, isOpen: true, step: 1, answersTouched: false, followUpAnswersCount: 0, confirmedChecked: false };

test('form: a fresh open Intake with no input is not dirty', () => {
  assert.equal(deterministicFormDirty(formClean), false);
});

test('form: typing any answer makes it dirty', () => {
  assert.equal(deterministicFormDirty({ ...formClean, answersTouched: true }), true);
});

test('form: advancing past step 1 makes it dirty', () => {
  assert.equal(deterministicFormDirty({ ...formClean, step: 2 }), true);
});

test('form: entering a follow-up answer makes it dirty', () => {
  assert.equal(deterministicFormDirty({ ...formClean, followUpAnswersCount: 1 }), true);
});

test('form: a ticked-but-unsubmitted attestation is dirty', () => {
  assert.equal(deterministicFormDirty({ ...formClean, confirmedChecked: true }), true);
});

test('form: a CONFIRMED record is never dirty (read-only, no discard prompt)', () => {
  assert.equal(deterministicFormDirty({ ...formClean, saved: true, step: 5, answersTouched: true, confirmedChecked: true }), false);
});

test('form: a CLOSED Session is never dirty', () => {
  assert.equal(deterministicFormDirty({ ...formClean, isOpen: false, answersTouched: true }), false);
});

// --- Conversational chat dirtiness ------------------------------------------

const chatClean = { saved: false, isOpen: true, studentTurnCount: 0, draftLength: 0, capturedFieldCount: 0, correctionCount: 0, confirmedChecked: false };

test('chat: the opening assistant turn alone is not dirty', () => {
  assert.equal(chatIntakeDirty(chatClean), false);
});

test('chat: one sent student turn makes it dirty', () => {
  assert.equal(chatIntakeDirty({ ...chatClean, studentTurnCount: 1 }), true);
});

test('chat: an un-sent composer draft makes it dirty', () => {
  assert.equal(chatIntakeDirty({ ...chatClean, draftLength: 5 }), true);
});

test('chat: captured evidence makes it dirty', () => {
  assert.equal(chatIntakeDirty({ ...chatClean, capturedFieldCount: 2 }), true);
});

test('chat: a review correction makes it dirty (review corrections are preserved)', () => {
  assert.equal(chatIntakeDirty({ ...chatClean, correctionCount: 1 }), true);
});

test('chat: a CONFIRMED record is never dirty', () => {
  assert.equal(chatIntakeDirty({ ...chatClean, saved: true, studentTurnCount: 6, correctionCount: 2 }), false);
});

// --- Save failure: content stays retryable ----------------------------------
// On a save failure the modal does NOT flip to `saved`; the student's turns and
// corrections remain in memory, so dirty stays true and the guard keeps
// protecting them. This models the post-save-failure state.
test('save failure keeps content dirty/retryable (saved stays false)', () => {
  const afterFailedSave = { ...chatClean, saved: false, studentTurnCount: 6, correctionCount: 1, confirmedChecked: true };
  assert.equal(chatIntakeDirty(afterFailedSave), true, 'a failed save must not clear the dirty/retryable state');
});

// --- Registry / confirm gate + cross-context isolation ----------------------

test('confirm message does not promise crash recovery', () => {
  assert.match(INTAKE_EXIT_CONFIRM_MESSAGE, /not saved anywhere/i);
  assert.doesNotMatch(INTAKE_EXIT_CONFIRM_MESSAGE, /recover|restored|restore your work/i);
});

test('no blockers => exit is allowed without prompting', () => {
  __resetUnsavedBlockersForTest();
  let prompted = false;
  assert.equal(confirmExitIfBlocked(() => { prompted = true; return false; }), true);
  assert.equal(prompted, false, 'a clean state must not prompt');
});

test('a dirty blocker forces a confirm; cancelling blocks the exit (preserves content)', () => {
  __resetUnsavedBlockersForTest();
  registerUnsavedBlocker('chat-intake-session-A', () => true);
  assert.equal(anyUnsaved(), true);
  // Student cancels the discard prompt -> exit is refused -> content preserved.
  assert.equal(confirmExitIfBlocked(() => false), false);
  // Student confirms discard -> exit allowed.
  assert.equal(confirmExitIfBlocked(() => true), true);
});

test('isolation: only the active modal\'s own blocker counts; a clean sibling does not force a prompt', () => {
  __resetUnsavedBlockersForTest();
  // Session A was confirmed/closed (clean); Session B is a different context and
  // also clean. Neither should force a discard prompt — a confirmed Session A
  // must never make Session B appear dirty, and vice versa.
  const unregA = registerUnsavedBlocker('chat-intake-session-A', () => false);
  registerUnsavedBlocker('form-intake-session-B', () => false);
  assert.equal(anyUnsaved(), false);
  // Now Session B becomes dirty; it is tracked under its own id only.
  unregA();
  registerUnsavedBlocker('form-intake-session-B', () => true);
  assert.equal(anyUnsaved(), true);
});

test('unregister (unmount) removes a blocker so a later unrelated exit is clean', () => {
  __resetUnsavedBlockersForTest();
  const unreg = registerUnsavedBlocker('chat-intake-session-A', () => true);
  assert.equal(anyUnsaved(), true);
  unreg(); // modal unmounts (confirmed or discarded)
  assert.equal(anyUnsaved(), false);
});

test('a throwing dirty getter must not strand the user (treated as not-dirty for that id)', () => {
  __resetUnsavedBlockersForTest();
  registerUnsavedBlocker('faulty', () => { throw new Error('boom'); });
  assert.equal(anyUnsaved(), false);
});
