# S11-01 — NIT3004 first Intake reconnection

## Scope and basis

Joseph reviewed the opening in a synthetic student demonstration on 26 October 2026 and approved the change. Start from main `edaa4ec` (PR #98). This is a pre-classroom usability finding, not measured learning improvement. The currently supported Intake teaching flow is NIT3004; NIT3003 design remains deferred.

The first question now reads:

> Where is your project up to, and what part will you be responsible for in this unit?

It establishes the existing project baseline and individual responsibility instead of asking for a new commitment “before S2”. The display-only hint accepts work not yet started and roles still being decided. Two optional collapsed areas provide sentence starters and an explicitly illustrative answer. The next-action starter says “before the next class” and is optional.

## Implementation

- `src/intakeStart.ts` owns first/later Session presentation copy. The first screen has a reconnection guide, clearer draft placeholder, “I haven’t started yet” and “I need help getting started” shortcuts. Shortcuts populate text without sending.
- Guidance/example lives outside `turns`, not in a system message, input default, API field or stored source. It disappears once the first answer is sent. Initial scrolling keeps the opening visible; the existing composer occupies separate layout space.
- Later openings, prior responsibility/action interpolation, missing-action handling, model instructions/schema, source-grounding logic, review, signed targets and global stopping remain unchanged. A model-ready first answer still reaches review immediately. No new mandatory question or minimum round count.
- No migration, configuration/environment change, paid call, production write or automatic merge/deployment. Historical saved conversations are not rewritten.

## Verification

- `npm test`: 241 of 241 passed, including four new opening-copy tests and the existing structural-stop/record/API regressions.
- `npm run build`: TypeScript and Vite passed; existing large-chunk warning only.
- Real `SessionIntakeModal` browser test with synthetic RPC/provider transport: optional controls and draft-only shortcuts; 1280 by 900 desktop and 390 by 844 mobile; one-answer review and save; display guidance absent from chat request, record request and saved source; model-selected next-direction clarification; unchanged later carryover with and without a prior action; saved/closed S1 read-only behaviour. Desktop/mobile screenshots inspected. This does not assert live model semantic quality or production SQL acceptance.

The normal Playwright browser download was unusable in this environment. A temporary npm-distributed Chromium executable was used for the browser test; no project dependency or lockfile change was needed.

Reproduce browser check with local Playwright and Chromium:

```sh
S10_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
S10_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
node tests/session-ai/intake-start.browser.mjs
```

## Operator acceptance after release

Open an unsubmitted NIT3004 S1 in the demonstration class. Confirm the new question, expand the optional hints/example, submit the prepared CampusGuide answer and check the review. Existing confirmed S1 records should still show their saved history. Continue the full demonstration rather than restarting every historical case. Collect any new failures privately; broader Sprint 11 scope is not precommitted.
