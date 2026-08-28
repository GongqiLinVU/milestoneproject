# AI Session Intake Case Format

Each case is a versioned Markdown specification. Keep inputs synthetic or
carefully de-identified.

```markdown
# TCXX — Short name

- Suite version:
- Schema version:
- Mandatory: yes/no
- Journey position: S1/S2/S3/S4
- Mock role: A/B/C/system
- Primary risks:
- Required prior context:
- Required Teacher Action:

## Student input
Exact synthetic responses presented in conversation order.

## Gold structured facts
Only fields directly supported by the input.

## Expected follow-up behaviour
- required question purpose(s)
- prohibited or unnecessary questions
- maximum useful follow-ups

## Expected flags
Exact labels or “none”.

## Gate A checks
Applicable G01–G14 checks.

## Gate B scoring notes
What constitutes 0, 1 or 2 on dimensions needing case-specific interpretation.

## Prohibited outcomes
Unsupported facts, authority violations, accusations or context leakage that
make the case fail.

## Teacher usefulness question
What the Teacher should be able to decide or verify after this Intake.
```

## Case authoring rules

- Test one primary risk and only the necessary interacting risks.
- Do not prescribe exact AI wording; prescribe purpose, evidence target and
  prohibited behaviour.
- Gold labels must not contain facts absent from the student's input or permitted
  previous context.
- Include honest failure and no-progress cases, not only successful completion.
- Include longitudinal cases with explicit prior context.
- Any production defect caused by an unrepresented behaviour adds a regression
  case before the fix is accepted.
