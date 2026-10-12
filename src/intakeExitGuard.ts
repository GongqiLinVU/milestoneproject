// Sprint 9 R05 — Intake unsaved-exit safety.
//
// Scope and non-goals (deliberately minimal, see S9-R05_REPORT.md):
//   * This module ONLY protects accidental EXIT while unsaved in-memory content
//     exists. It does NOT introduce any persistent transcript storage or a draft
//     synchronisation system. Nothing here writes answers to localStorage,
//     IndexedDB, cookies or the server.
//   * The browser `beforeunload` prompt is a best-effort "leave site?" dialog
//     only. It is NOT crash recovery and must never be described as such: if the
//     tab is killed, the OS crashes, or the student confirms "leave", the
//     in-memory answers are gone. The protection is strictly "don't leave by
//     accident", not "we kept your work".
//
// The guard has two cooperating parts:
//   1. Pure dirty predicates (`deterministicFormDirty`, `chatIntakeDirty`) so the
//      exact "unsaved content exists" condition is testable without a DOM.
//   2. A tiny process-wide registry so that EVERY exit path — the modal's own
//      close controls AND other in-app exits that live outside the modal tree
//      (e.g. the Sign out button) — can consult one source of truth and share a
//      single `beforeunload` listener.

export const INTAKE_EXIT_CONFIRM_MESSAGE =
  "You have unsaved Session Intake answers that have not been confirmed. " +
  "If you leave now they will be discarded — they are not saved anywhere until you confirm. " +
  "Leave and discard your answers?";

// --- Dirty predicates --------------------------------------------------------
// A modal is only "dirty" when the student has entered content that is not yet
// authoritatively saved (confirmed) and the Session is still open for input.
// A confirmed / read-only Session is NEVER dirty (confirmed submissions stay
// read-only and must not trigger a discard prompt). A read-only history view is
// never dirty for the same reason.

export interface DeterministicDirtyInput {
  saved: boolean;        // an authoritative confirmed record exists for this Session
  isOpen: boolean;       // the Session still accepts input
  step: number;          // 1..5 wizard step
  answersTouched: boolean; // any core answer field has non-default content
  followUpAnswersCount: number; // number of follow-up answers entered
  confirmedChecked: boolean;    // attestation box ticked but not yet submitted
}

export function deterministicFormDirty(input: DeterministicDirtyInput): boolean {
  if (input.saved || !input.isOpen) return false;
  return (
    input.step > 1 ||
    input.answersTouched ||
    input.followUpAnswersCount > 0 ||
    input.confirmedChecked
  );
}

export interface ChatDirtyInput {
  saved: boolean;        // confirmed record exists
  isOpen: boolean;       // Session accepts input
  studentTurnCount: number; // number of student messages sent so far
  draftLength: number;      // length of the un-sent composer draft (trimmed)
  capturedFieldCount: number; // evidence fields captured from the conversation
  correctionCount: number;    // review corrections made but not yet saved
  confirmedChecked: boolean;  // attestation ticked but not yet submitted
}

export function chatIntakeDirty(input: ChatDirtyInput): boolean {
  if (input.saved || !input.isOpen) return false;
  return (
    input.studentTurnCount > 0 ||
    input.draftLength > 0 ||
    input.capturedFieldCount > 0 ||
    input.correctionCount > 0 ||
    input.confirmedChecked
  );
}

// --- Process-wide unsaved registry + shared beforeunload --------------------

const blockers = new Map<string, () => boolean>();
let beforeUnloadBound = false;

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!anyUnsaved()) return;
  // Standard cross-browser incantation for the native "leave site?" prompt.
  event.preventDefault();
  event.returnValue = "";
  return "";
}

function ensureBeforeUnloadBound() {
  if (beforeUnloadBound || typeof window === "undefined") return;
  window.addEventListener("beforeunload", onBeforeUnload);
  beforeUnloadBound = true;
}

/**
 * Register (or update) an unsaved-content blocker under a stable id. `isDirty`
 * is called lazily whenever an exit is attempted, so callers can pass a getter
 * that reads current state. Returns an unregister function.
 */
export function registerUnsavedBlocker(id: string, isDirty: () => boolean): () => void {
  blockers.set(id, isDirty);
  ensureBeforeUnloadBound();
  return () => { blockers.delete(id); };
}

/** True if any registered blocker currently reports unsaved content. */
export function anyUnsaved(): boolean {
  for (const isDirty of blockers.values()) {
    try { if (isDirty()) return true; } catch { /* a faulty getter must not strand the user */ }
  }
  return false;
}

/**
 * Gate an in-app exit (modal close, Session/context switch, Sign out, in-app
 * navigation). Returns true if it is safe to proceed. When unsaved content
 * exists it asks the student to confirm discarding; cancelling returns false so
 * the caller leaves all entered answers and corrections intact in memory.
 */
export function confirmExitIfBlocked(
  confirmImpl: (message: string) => boolean =
    (typeof window !== "undefined" ? window.confirm.bind(window) : () => true),
): boolean {
  if (!anyUnsaved()) return true;
  return confirmImpl(INTAKE_EXIT_CONFIRM_MESSAGE);
}

/** Test-only: clear all registered blockers. */
export function __resetUnsavedBlockersForTest() {
  blockers.clear();
}
