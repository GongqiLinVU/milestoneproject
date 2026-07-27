# Start Session Protocol

GitHub `main` is the source of truth. Begin every session from the latest
`main`; do not rely on chat history or an older local checkout.

## Repository access

- Use the connected GitHub App as the default repository interface in every
  session.
- Use the GitHub App to inspect the latest `main`, branches, commits, open and
  merged pull requests, and repository files.
- Use the GitHub App for supported write operations, including creating
  branches, commits and focused Draft PRs.
- Do not depend on a temporary container retaining GitHub CLI installation,
  credentials or device-login state between sessions.
- Local tools may be used for implementation and validation. Use local
  `git` or GitHub CLI only as an explicit fallback when a required operation
  is not available through the GitHub App.
- If the GitHub App is unavailable or lacks the required repository permission,
  report the exact blocker instead of repeatedly requesting temporary CLI
  authentication.

## Read first

1. Inspect the latest code, schema, migrations, open pull requests and recent
   merged pull requests.
2. Read `AI_CONTEXT.md`, `ROADMAP.md` and the relevant Sprint `PLAN.md` and
   `HANDOFF.md` under `docs/sprints`.
3. Reconcile documentation with `main`, pull requests and deployment evidence.
   Code and merged Git history win if a document is stale.

## Select the work

If no Sprint is named:

1. Identify the active Sprint from `ROADMAP.md`.
2. Continue its first incomplete Phase according to its `HANDOFF.md`.
3. Do not repeat completed and verified work.

If a Sprint is named:

1. Check its status and completion evidence.
2. If incomplete, continue its first incomplete Phase.
3. If complete, summarise the evidence and ask what should be extended or
   changed. Do not rewrite the completed Sprint.
4. Plan an approved new requirement in the next Sprint, with a reference to the
   Sprint where it originated.

Before implementation, report the current state, the single Phase proposed for
this session, affected files and database objects, security/privacy impact,
acceptance criteria and tests. Wait for clarification only when scope or a
material decision is genuinely ambiguous.

## Implementation rules

- Work on one Phase per session and always branch from latest `main`.
- Keep completed Sprint plans and handoffs as historical records. Correct
  factual documentation errors explicitly; put changed requirements in a later
  Sprint.
- A current Sprint may fix defects required to meet its existing acceptance
  criteria. New behaviour belongs in a later Sprint.
- Do not expand scope beyond the selected Phase.
- For database changes, include an idempotent migration, matching final state
  in `supabase/schema.sql`, impact analysis, verification queries, production
  order and rollback guidance.
- Update the current Sprint `HANDOFF.md` and `ROADMAP.md` with actual evidence.
- Run the Phase's required validation.
- Create a focused Draft PR and do not merge without explicit approval.
