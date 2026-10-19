# S7 record-contract iteration

Baseline: PR #83 / bd9d7a3b21b7e31b7d2a4625ee58245109b3b999.

## Problem and implemented changes

Four user-run S7 scenarios yielded six real provider outputs. Dialogue closed naturally, but generic field/state combinations lost otherwise useful facts. Null progress kinds inherited advanced, next-step uncertainty accumulated beside an accepted plan, and rich first-turn output omitted a stated next action while filling the eight update slots.

The new provider schema uses field-specific alternatives. Each alternative contains only its relevant fields, without unrelated null metadata. A claim cannot be available; verification and testing have their own state enums. Claim progressKind is required and includes unknown. Evidence types are required for evidence updates. nextStep is a separate required current-state section with planned/tentative/unknown/none, an action, student-supported expected evidence, and source/context pointers. It does not compete with other update slots. A planned step requires a nonempty action and actual integer student source. Other updates allow sixteen items; the runtime accepts those sixteen plus the separate next step.

Teacher support has its own supportRequested value, retaining tentative wording. Prompts prohibit invented illustrative deliverables and ask for every disclosed executed check and untested limitation. No extra model call, minimum-round rule, forced follow-up or conversation gate was added. Parser: intake-parser.v1.3.0; dialogue: intake-dialogue.v1.3. Existing SQL-compatible prompt/policy identifiers remain.

Legacy candidates remain replayable. Recorded claim/verification available states can be normalized; a testing student_claim without a result stays unknown rather than becoming executed. Null claim progress kinds remain unknown, except an unambiguous no_progress label misplaced in another candidate from the same student turn can be recovered and traced. Source pointers can be repaired using the latest adjacent context; an unnecessary context does not discard directly sourced planned evidence/testing. Unknown next-step text is not a task; choosing a plan updates that state instead of appending uncertainty. All transformations and model wording differences remain visible in debug.

## Explicit unknown and release prerequisite

Run supabase/migrations/20261019_sprint10_unknown_progress.sql after the focused-review migration, before deploying this UI/API. Keep this PR draft until the owner confirms execution. It extends only the focused v1.2 record validator to allow unknown progress, using an unchanged private validator for the other structure checks. The original record is stored unchanged as unknown. Legacy v1.1 validation still rejects unknown; no table rows, availability settings, usage totals or access permissions are changed.

The review editor lets the student correct the progress state. Unknown next steps display as undecided. Existing saved records are not rewritten.

## Frozen evidence versus new-contract fixtures

The repository fixture tests/ai-session-intake/fixtures/s7-real-output-cases.json preserves the six original raw candidates, conversation, initial snapshots and then-observed records. Hashes identify the original uploaded debug files. Repeated observer snapshots/provider identifiers are omitted; the user's delivered TXT retains the full originals. Inputs are simulated students and outputs are real provider responses. These are not independent real-student performance observations.

Historical replay chains new answers across turns. It does not replace missing candidate fields with human expected values. Separate, explicitly synthetic fixtures exercise the new nextStep/support contract. Frozen replay cannot establish how a changed prompt will perform on future model calls.

| Case | Verified deterministic improvement | Remaining limitation of frozen candidate |
| --- | --- | --- |
| Completed work | O observation detects clear actionability without structured next step; no invented repair | Original model omitted next_action. New mandatory section needs fresh model acceptance later. |
| Partial progress | Missing classification is unknown; speculative expected-evidence wording is observed | Original lacks separate support and includes illustrative deliverables. New typed support/next-step fixtures cover the intended contract, not live model adherence. |
| No progress | Misplaced no_progress recovered; accepted action replaces uncertainty; future test/evidence retained without claiming execution | Original truncated assistant question remains unchanged. |
| Short demo answer | First-turn claim and second-turn demo verification survive state/source normalization | Chrome visual check remains in evidence text; frozen candidate never classified it as an executed testing update. We do not manufacture that classification. |

## Validation

- 165 adaptive/API tests, including eight frozen/new-contract tests. Existing protection against invented artifacts, malformed executed results, invalid sources and unauthorized calls remains.
- Four isolated SQL/helper tests: idempotent migration, actual unknown save/readback, strict legacy rejection, malformed values and private helper permissions.
- Real React plus isolated SQL browser rehearsal: progress-state editor, unknown survives save/reload, optional next-step omissions, multiple facts and method retained, detailed debug recovery, desktop/mobile retry/export/scroll behavior. Provider output is synthetic.
- AJV 2020 validates both structured schemas and rejects incompatible field states, null claim classification and a planned step without an action/student source.
- TypeScript/Vite production build; existing large-chunk warning only.
- No paid calls, no production SQL or history edits. Fresh provider behavior remains for new-case acceptance after the migration and release.

## Next acceptance

Do not ask the user to repeat the four old sessions. After release, use a new rich one-turn case to check nextStep completeness and a short single-step agreement to verify its source. Add only new observed failures to the frozen corpus. Keep semantic uncertainty at O while collecting evidence.
