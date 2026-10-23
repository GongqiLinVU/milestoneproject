# Session focus and class AI reference budgets

## Session focus

Use curriculum order: an effectively open Session takes priority; otherwise select the first non-closed Session. If everything is closed, show the last Session. A newly generated plan therefore starts at S1, even when a rehearsal class has old dates. Automatic date windows still affect effective open/closed status. A teacher's explicit viewing choice remains separate from opening access.

## Defaults and authority

Each class/teaching block starts with a US$10 reference budget and US$25 administrator ceiling. Teachers can adjust their own class budget within its ceiling. Only a super administrator (or trusted database/service maintenance) can change the ceiling. SQL rejects over-ceiling budgets and teacher attempts to change the ceiling, including direct table/API updates. Administrators may raise a class ceiling up to the existing schema's US$1,000 maximum.

These are monitoring references, not billable reservations or runtime spending stops. Existing round controls and advisory usage recording are unchanged. No new cost-based conversation interruption is introduced.

On first installation, existing US$0/1 trial references with no usage rows become US$10. Existing usage, larger choices and historical records are preserved; an existing budget above US$25 gets a matching ceiling. Rerunning the migration does not reset deliberately lowered budgets. New classes default to US$10.

## Planning estimate

The page shows roster size × 9 possible Intake Sessions (S10 is feedback) × US$0.01–0.03 per completed Intake, including chat and record extraction. This is an explicit conservative planning assumption, not a measured confidence interval, quote or guarantee. For 22 students: 198 intakes, US$1.98–5.94 before unusual retries/longer outputs or a model change. The US$10 starting reference includes headroom.

Pricing reference checked 23 October 2026: gpt-5-mini input US$0.25 and output US$2.00 per million tokens, with reasoning included in output usage. See https://developers.openai.com/api/docs/models/gpt-5-mini and https://openai.com/gpt-5/. Example token assumptions spanning about 10k–12k total input and 3.75k–13.5k output across a completed chat plus extraction give roughly the displayed range. Runtime accounting continues to use configured provider/model rates, not this UI planning assumption.

## Rollout and validation

Apply `supabase/migrations/20261023_sprint10_w_budget_defaults.sql` after the existing class/roster/activation migrations, before deploying the UI. No paid model call or production write was made by development tests.

- `npm test` (237 tests); `npm run build`.
- `S10_PGLITE_MODULE=/path/to/pglite/dist/index.js node --test tests/classes/budget.test.mjs` (5 database tests).
- `S10_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs S10_CHROMIUM_EXECUTABLE=/path/to/chromium node tests/sessions/planning-browser.mjs` exercises the real Session controls with synthetic transport: S1 selection, teacher budget/default/ceiling/estimate and administrator ceiling editing.
