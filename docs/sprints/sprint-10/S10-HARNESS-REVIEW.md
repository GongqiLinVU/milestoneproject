# Intake harness review and intervention visibility

Baseline: PR #82, main d72253979425a6dad97d8c555fd7fe13d0b278bd.

## Goal and scope

First make existing intervention visible. This change does not relax, add or remove conversation, extraction, routing, pricing or submission rules. No migration, provider configuration or paid calls are needed.

O/W/A currently describes the debug sidecar only. Existing runtime controls remain active. `summary.observerActionsExecuted` counts the sidecar's actions (zero); `summary.observedRuntimeInterventions` counts the recorded effects of existing controls. These counts have different scopes. The legacy `actionsExecuted` key remains zero for compatibility. Recorded replacements are not automatically errors: they may represent legitimate corrections.

## Current control inventory

| Area | Current behavior | Classification / next review |
| --- | --- | --- |
| Authentication, enrolment, session mode/window, duplicate submission | Enforced server-side and at save | System boundary; retain |
| Conversation order, text/array limits, schema and source pointer shape | Reject malformed input | System boundary; retain; separate from semantic confidence |
| Eight-question limit | Forces review | Agreed product boundary; retain for now |
| Model review decision | Honoured | Conversation policy |
| Teacher-help matching / accepted action plus established fields | Can force review independently of model | Semantic action; review after visibility work |
| Future-action English phrase matching | Rejects candidates without a listed phrase | Semantic action; S6 false-negative candidate |
| Token overlap and artifact vocabulary | Rejects or relocates sources | Semantic action; cannot establish meaning reliably |
| Number stripping and test-method token stripping | Changes accepted text | Semantic action; now captures original/applied candidate |
| Flat answer projection | Later claims/evidence/tests replace earlier scalar values | Information retention risk; now captures intermediate before/after values |
| Review transition | Replaces model message with fixed text | Message action; visible separately from routing |
| Missing/unsafe message | May use a fixed fallback; invalid response may return retry error | Requires separate reason-level review; not all failure causes retained today |
| Financial limits / unknown costs | Observed without stopping conversation | Retain observation policy |
| Focused save | Optional details may be blank; core fields/structure still validated | Retain student confirmation and structural validation |

## New trace details

Accepted/repaired field decisions include `appliedCandidate`, `transformations` (changed property names), `recordBefore` and `recordAfter` for the affected field group. Existing accepted values and decisions are unchanged.

The observer exports a separate `runtimeInterventions.items` list:

- `field_rejection`: rejected model candidate and recorded reason.
- `source_relocation`: original and applied source indexes.
- `field_rewrite`: candidate before/after sanitisation.
- `record_value_replacement`: replacement of nonempty string values during projection. Includes initial defaults or carried context; not necessarily lost facts.
- `message_replacement`: original and delivered message.
- `route_override`: proposed and final routes plus reason.

Each item links to its originating event. Turn observations report coverage. Old exports cannot recover intermediate values or unrecorded failure causes; `legacy_partial` explicitly reports those limits. Bounded saved-debug compaction can still omit details; no completeness claim is made for compacted or historical traces. This inventory does not instrument every API/SQL boundary failure yet.

## Evidence and validation

- S6-2 historical replay identifies three recorded effects: message replacement and two field rejections. Its missing intermediate rewrite/projection trace is explicitly partial.
- S5-5 historical replay identifies eight recorded effects (route overrides and field rejections). This describes that historical release, not a claim that current routing behaves identically.
- S5-3/S5-4 are failure traces without recorded field decisions; zero counted effects does not establish zero runtime intervention.
- 149 adaptive/API tests pass, including three new intervention trace tests. TypeScript/Vite production build passes (existing chunk-size warning).
- Replay uses uploaded files locally; student traces and identifiers are not committed.

## Ordered follow-up

1. Deploy visibility and collect detailed before/after traces.
2. Preserve multiple disclosed facts and stop destructive method rewriting; distinguish corrections from accumulation.
3. Review semantic rejection/repair rules one at a time with positive and negative cases. Preserve tentative proposals as tentative; do not turn ability into commitment.
4. Simplify semantic forced-ending conditions while retaining agreed round limits and student choice.
5. Tune response latency only after fidelity is stable.

For each behavior change compare raw candidate, accepted updates, projected record and student-confirmed record. Promotion from O to W/A must be explicit per rule and recorded, rather than inferred from a sidecar-level label.
