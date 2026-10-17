# Intake O/W/A debug observations

The debug JSON retains its existing conversation, record, corrections and events. A new harness sidecar records trace evidence for joint review. It has no connection to routing, extraction or persistence decisions and makes no extra model calls.

O records observations; W displays a non-blocking warning; A executes an explicitly enabled intervention. Only O is enabled in this sidecar. Levels describe intervention, not severity or student ability. No field-absence heuristics or student verdicts are introduced.

Each observation carries detectorVersion, timestamp, zero-based eventIndex and conversation turnIndex, student-message round count, original trace evidence, warning visibility and action execution. Request errors retain their original error codes without guessing the underlying cause. Model uncertainty is labeled as unverified model self-report. Field decisions retain their source references. Routing comparisons preserve proposed/final route and message; legacyIntervention describes differences already present in the runtime, not an action by the observer.

The summary warningsDisplayed/actionsExecuted counts apply ONLY to this observer. Existing runtime gates and interventions still operate; this patch does not implement the planned conversation/round/usage redesign. Raw event responses remain available for detailed interpretation. O observations are generated at export from available in-memory events, not persisted continuously. Existing confirmed-history exports may have no runtime events. This is debug export instrumentation, not draft recovery.

Validation: production build passed (existing large-chunk warning); two offline observer tests passed. No paid calls or production database changes.

Reproduce tests:

```sh
npx tsc src/intakeObservations.ts --outDir .test-observations --target ES2022 --module nodenext --moduleResolution nodenext --skipLibCheck
node --test tests/session-ai/observations.test.mjs
```
