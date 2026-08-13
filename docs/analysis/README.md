# Evidence Analysis

This directory is the durable home for product-learning analysis across teaching
blocks. It exists to make platform evolution evidence-led rather than driven by
assumption, isolated anecdotes or premature AI adoption.

## Improvement loop

1. **Observe** — run the current teaching workflow without changing rules simply
   to make a dashboard look better.
2. **Collect** — export the minimum evidence needed with read-only, versioned
   queries.
3. **Analyse** — separate participation coverage, response quality, longitudinal
   consistency and teaching actionability.
4. **Decide** — record what should be retained, changed, removed or investigated.
5. **Implement** — place accepted product work into a later Sprint.
6. **Validate** — use the next teaching block to test whether the change improved
   the intended outcome.

AI is introduced only where repeated analysis demonstrates a useful extraction,
comparison, question-generation or support task. AI must not be added merely
because the technology is available.

## Directory convention

Each teaching block has its own directory:

```text
docs/analysis/
  README.md
  YYYY-BLOCK/
    README.md
    queries/
    observations/
    decisions/
```

- `queries/` contains read-only, reproducible SQL with purpose, scope and output
  definitions.
- `observations/` contains dated, anonymised aggregate findings and limitations.
- `decisions/` records accepted product implications and the Sprint to which
  they were assigned.
- Raw CSV exports and identifiable student-level data must not be committed.

## Cohort denominator

Every analysis must state all relevant denominators:

- **Starting cohort** — students enrolled at the beginning of the observation.
- **Withdrawn** — students who formally left the cohort.
- **Active cohort** — students expected to participate at the time measured.
- **Eligible cohort** — active students for whom a particular activity was
  required.
- **Submitted cohort** — eligible students who supplied the evidence.

Do not classify withdrawn students as missing or disengaged. Do not report an
average response without also reporting submitted and eligible counts.

## Analysis lenses

Every review should consider:

1. **Coverage** — who submitted, who was eligible and where missingness clusters.
2. **Question effectiveness** — whether an item produces useful differentiation
   rather than ideal or uniform answers.
3. **Evidence quality** — whether claims identify responsibility, deliverable,
   evidence, timing and support needs.
4. **Longitudinal consistency** — whether earlier claims align with later work
   evidence, without treating inconsistency as dishonesty.
5. **Teaching actionability** — whether a teacher could understand the situation
   and take a specific support action.
6. **Student usefulness** — whether the activity helps a student understand the
   current task, support available and next action.
7. **System effects** — whether schedule, classroom supervision, interface or
   communication explains behaviour better than the question itself.

## Privacy and repository rules

- Never commit raw student exports, names, emails, Student IDs or Auth user IDs.
- Pseudonymous student keys may be used temporarily for local joins but should
  not be published in durable reports unless necessary.
- Durable reports prefer Team- or cohort-level aggregates and carefully
  de-identified examples.
- Queries should remove direct identifiers and use read-only statements.
- Small-cohort findings are product evidence, not statistically validated
  predictions or automatic student judgments.

## Decision standard

A finding should result in one of five explicit outcomes:

- **Retain** — evidence supports the current design.
- **Refine** — the teaching purpose is valid but the question or workflow needs
  improvement.
- **Remove** — the item is duplicative or produces too little value.
- **Investigate** — evidence is insufficient or contradictory.
- **Pilot** — test a bounded new approach in the next block.

Every implementation decision must cite the observation that motivated it.
