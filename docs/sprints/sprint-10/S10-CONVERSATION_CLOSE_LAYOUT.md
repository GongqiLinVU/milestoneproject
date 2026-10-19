# Model-led check-in completion and isolated conversation scrolling

## Production evidence

The S5-5 export shows the second model response set readyForReview=true, but the existing harness returned continue because verification/next-action extraction did not meet its older completeness rules. The model then asked for a live demo it could not observe, and another confirmation produced repeated questions.

## Changes

- A strict boolean readyForReview=true or model route=review now permits the review step even if extracted evidence fields are incomplete. Existing question ceiling and help routing remain. There is no new regex that automatically ends a conversation containing “will do”; the model receives the complete exchange and judges brief agreement in context. Finishing means showing the review, not saving without confirmation.
- Instructions explicitly distinguish collecting a record from observing a demo or executing tests. They ask the model to accept contextual agreement, preserve tentative plans, extract earlier stated next steps and close without filling every verification field. Missing facts must not be invented. The existing save schema/validation remains; incomplete required record fields may still need student correction at review.
- Parser revision is intake-parser.v1.1.0. The manifest adds dialogueRevision=intake-dialogue.v1.1 to identify the instruction change while retaining the existing database-compatible prompt version. Visual debug includes the model-ready routing reason.
- The conversation now has a message scrolling region and a separate, naturally sized composer. The composer no longer overlays messages or relies on a fixed bottom-padding allowance. The header is opaque and viewport height uses dynamic viewport units.
- While Intake is mounted, body/HTML scrolling is locked; existing style values and scroll position are restored on unmount. Automatic scrolling targets only the message viewport, rather than scrolling all document ancestors through scrollIntoView.

## Validation and limits

146 adaptive/API tests and the production TypeScript/Vite build pass (existing bundle-size warning). Updated historical tests explicitly cover the new policy of honoring model-ready review while preserving UI/backend agreement. Added tests distinguish contextual model judgment from keyword-only stopping.

The real React/isolated PostgreSQL browser rehearsal passes at desktop and 390px/600px narrow height: body scroll lock, composer/message non-overlap, last message visibility at scroll end, raw debug preview/download, retry, correction/confirmation, read-only reload, and scroll-style restoration on close. Desktop/mobile screenshots were inspected. Synthetic Auth/provider transport only; this is not a live model quality or Safari acceptance claim.

No production SQL, data reset, usage configuration changes or paid provider calls. Existing usage observation behavior is unchanged. Student-confirmed records and save contracts remain unchanged.
