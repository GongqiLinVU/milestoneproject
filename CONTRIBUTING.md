# Contributing Guide

## Purpose

This guide defines how changes should be proposed, implemented, tested and documented for Engineering Studio Platform.

The project is currently small, but it should be maintained with production discipline because it handles real student activity data.

## Development principles

- Start from the teaching problem, not the technology.
- Prefer the smallest maintainable change.
- Keep student and teacher experiences consistent.
- Treat RLS and database constraints as part of the application, not optional backend details.
- Avoid speculative platform complexity.
- Keep AI out of the critical path until the underlying workflow is stable.

## Branch and commit workflow

For non-trivial changes:

1. Create a focused branch.
2. Make one coherent change.
3. Test locally.
4. Review database and security impact.
5. Update documentation.
6. Open a pull request.
7. Merge only after acceptance criteria pass.

Suggested branch names:

```text
feature/teacher-checkin-table
fix/duplicate-message
chore/update-project-docs
```

Commit messages should be short and specific:

```text
Add teacher check-in table
Improve duplicate submission feedback
Add teacher update RLS policy
```

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required local variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never place secret keys in `.env.example`, source code or Markdown documentation.

## Required checks

Before submitting a change:

```bash
npm run build
```

Also manually check the affected workflow in the browser.

For student-form changes, test:

- Successful submission
- Required-field validation
- Duplicate or constraint failure
- Understandable error message
- Database record correctness

For teacher-dashboard changes, test:

- Unauthenticated access is blocked
- Teacher login works
- Teacher data loads
- Non-teacher access is denied
- Loading, empty and error states render correctly

## Database changes

Every database change must include SQL that can be reviewed and reproduced.

A database change should specify:

- Tables or columns affected
- Data migration impact
- Constraints
- Indexes
- RLS policies
- Grants
- Rollback or recovery approach
- Production verification query

After applying a production database change, synchronise the repository schema immediately.

Do not rely on a manual dashboard change that is absent from version control.

## RLS requirements

Any table containing student or teacher data must have RLS enabled.

Before approving a policy, answer:

1. Who can insert?
2. Who can select?
3. Who can update?
4. Who can delete?
5. Can an anonymous user access another student's information?
6. Can an authenticated non-teacher bypass the intended role check?

Avoid exposing raw database error text to students when a clearer product message can be shown.

## Frontend requirements

- Use TypeScript types for data models and component props.
- Keep Supabase calls in clear, reusable functions where practical.
- Show loading and error states.
- Keep forms keyboard accessible.
- Use labels for all form controls.
- Confirm destructive teacher actions.
- Do not expose sensitive configuration in UI logs.

## Documentation responsibilities

Update the relevant documents when behaviour changes:

- `README.md` for setup or user-visible capability changes
- `AI_CONTEXT.md` for durable current-state context
- `ROADMAP.md` when sprint scope changes
- `ARCHITECTURE.md` for structural or security decisions
- `CHANGELOG.md` for released changes

## Definition of done

A change is done when:

- The teaching use case is clear.
- The implementation is complete.
- Security impact has been reviewed.
- Relevant tests pass.
- Production deployment implications are known.
- Documentation is current.
- The change does not depend on undocumented manual configuration.
