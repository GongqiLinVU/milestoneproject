# Product Roadmap

## Product direction

Engineering Studio Platform will evolve from a single-course delivery portal into a reusable studio-based teaching platform. The roadmap deliberately prioritises reliable teaching workflows before analytics and AI.

## Sprint 1 — Production foundation

**Status: Completed**

Delivered:

- React, Vite and TypeScript application
- GitHub repository
- Vercel production deployment
- Supabase database integration
- Supabase health check
- Row Level Security
- Week 1 student check-in
- Class pulse
- Team conversation
- Four-week promise
- Poster peer review
- Duplicate submission constraints
- Poster self-review prevention
- Teacher authentication
- Teacher-only dashboard summary reads

Production validation completed for:

- Live page loading
- Database connectivity
- Student check-in write
- Goal storage
- Duplicate student ID rejection
- Teacher login
- Teacher dashboard counts

## Sprint 2 — Teacher Dashboard management

**Status: Active**

### Goal

Turn the dashboard from a summary screen into an operational teaching tool.

### Scope

- Detailed student check-in table
- Student name, ID, team, goal and submission time
- Teacher edit capability
- Teacher delete capability
- Sign-out
- Loading, empty and error states
- Clear student-facing duplicate submission message
- CSV export after record management is stable

### Out of scope

- Student accounts
- AI summaries
- Risk prediction
- Major database redesign
- Multi-course administration

### Acceptance criteria

- Only authenticated teachers can read records.
- Only authorised teachers can update or delete records.
- Student public users remain unable to read submissions.
- Edits are immediately reflected in Supabase and the dashboard.
- Delete requires an explicit confirmation.
- Errors are understandable and do not expose internal database details.

## Sprint 3 — Teaching analytics

**Status: Planned**

Potential scope:

- Participation overview
- Submission completion by activity
- Team-level aggregation
- Confidence distribution
- Poster review averages
- Missing submission indicators
- Filter and search
- Downloadable reporting

Analytics must remain descriptive and evidence based. They must not infer student performance without sufficient evidence.

## Sprint 4 — Student identity and team management

**Status: Planned**

Potential scope:

- Student authentication using approved university identity options
- Student profile
- Team membership
- Controlled resubmission or correction workflow
- Teacher-managed activity windows
- Tutor and coordinator roles

The current anonymous submission workflow should remain available until authenticated student onboarding is proven usable.

## Sprint 5 — AI-assisted teaching

**Status: Future**

Potential scope:

- Weekly evidence summary
- Common concern clustering
- Suggested teacher interventions
- Team health signals
- Reflection support
- Teacher copilot

Guardrails:

- AI must cite the underlying student evidence.
- AI output is advisory, not an automatic mark or disciplinary decision.
- Sensitive student information must be minimised.
- Teachers retain final judgement.

## Longer-term platform direction

Possible future modules:

- NIT3003
- AI workshops
- Industry project studios
- Developer meeting facilitation
- Reusable course and activity configuration
- Multi-course teacher administration

These expansions should only begin after the NIT3004 workflow is stable and demonstrably useful.
