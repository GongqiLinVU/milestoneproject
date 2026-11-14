import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  db,
  owner,
  identity,
  teacher1,
  teacher2,
  student1,
  student2,
} from "../classes/fixture.mjs";
after(() => db.close());
const value = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
await identity();
await owner();
const classId = await value("select id from teaching_blocks limit 1");
await db.query(
  "insert into auth.users(id,raw_app_meta_data) values($1,'{\"role\":\"teacher\"}'),($2,'{\"role\":\"teacher\"}'),($3,'{}'),($4,'{}')",
  [teacher1, teacher2, student1, student2],
);
await identity();
await db.query("select set_teacher_classes($1,$2,$3)", [
  teacher1,
  [classId],
  "Assigned teacher",
]);
await owner();
await db.query(
  "update teacher_profiles set must_change_password=false where user_id=$1",
  [teacher1],
);
const session = await value(
  "insert into studio_sessions(block_id,title,session_date,session_number,status,intake_access) values($1,'Closed Session',current_date,1,'closed','closed') returning id",
  [classId],
);
for (const [sid, uid] of [
  ["correction-one", student1],
  ["correction-two", student2],
]) {
  await db.query(
    "insert into student_roster(block_id,student_id,full_name,team_number) values($1,$2,$2,1)",
    [classId, sid],
  );
  await db.query(
    "insert into student_accounts(student_id,auth_user_id,status) values($1,$2,'activated')",
    [sid, uid],
  );
}
const record = {
  responsibility: {
    current: "Front-end development",
    change_from_previous: "initial",
  },
  claims: [
    {
      claim_id: "C1",
      statement: "Prepared the interface design",
      scope: "Interface design",
      progress_kind: "advanced",
      completion_percent: null,
    },
  ],
  evidence: [
    {
      evidence_id: "E1",
      claim_ids: ["C1"],
      type: "other",
      availability: "unknown",
      reference: null,
      verification_method: null,
      not_required_reason: null,
    },
  ],
  testing: [
    {
      test_id: "T1",
      claim_ids: ["C1"],
      execution_status: "unknown",
      method: null,
      observed_result: null,
      baseline_or_expected: null,
    },
  ],
  dependencies: [],
  blocker: { status: "unknown", description: "", support_requested: null },
  next_action: {
    action: "Implement interface",
    due_session: "S2",
    expected_evidence: "",
  },
};
const attestation =
  "This summary reflects what I am claiming and the evidence I have identified. Teacher verification is separate.";
const intake = await value(
  'insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,ai_assistance,student_confirmation,confirmed_payload_hash) values($1,$2,\'correction-one\',$3,\'session-intake.v1.2.0\',\'ai_assisted\',\'[{"actor":"student","text":"Original conversation"}]\',$4::jsonb,\'{"debug_events":[{"mode":"chat"}]}\',$5::jsonb,\'original-hash\') returning id',
  [
    session,
    classId,
    student1,
    JSON.stringify(record),
    JSON.stringify({ status: "confirmed", attestation, corrections: [] }),
  ],
);
const original = await value(
  "select to_jsonb(i) from student_session_intakes i where id=$1",
  [intake],
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261102_sprint11_intake_diagnostics_export.sql",
    "utf8",
  ),
);
const migration = fs.readFileSync(
  "supabase/migrations/20261102_sprint11_intake_summary_corrections.sql",
  "utf8",
);
await db.exec(migration);
await db.exec(migration);

await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_intake_teacher_reviews.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_intake_teacher_reviews.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_quick_review_choices.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_quick_review_choices.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_review_standards.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_review_standards.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_review_standards_v2.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261105_sprint11_review_teacher_feedback_receipts.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261111_sprint11_review_modes.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261111_sprint11_review_modes.sql",
    "utf8",
  ),
);

await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261112_review_suggestion_context.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261112_review_suggestion_context.sql",
    "utf8",
  ),
);

await owner();
const assessmentMigration = fs.readFileSync(
  "supabase/migrations/20261114_block_assessment_ledger.sql",
  "utf8",
);
await db.exec(assessmentMigration);
await db.exec(assessmentMigration);
const plan = JSON.parse(fs.readFileSync("src/defaultAssessment.json", "utf8"));
const roster = await value(
  "select id from student_roster where student_id='correction-one' and block_id=$1",
  [classId],
);
const otherRoster = await value(
  "select id from student_roster where student_id='correction-two' and block_id=$1",
  [classId],
);
const ledger = () => value("select get_assessment_ledger($1)", [classId]);
const config = (p = plan, v = 0) =>
  value("select set_assessment_plan($1,$2,$3)", [classId, v, p]);
const save = (version, scores = {}, comments = null, rosterId = roster) =>
  value("select save_assessment_record($1,$2,$3,$4,$5)", [
    classId,
    rosterId,
    version,
    scores,
    comments,
  ]);
const getRow = async () =>
  (await ledger()).rows.find((r) => r.rosterId === roster);
test("grades, configurations and audit are class authorized and teacher only", async () => {
  await identity(teacher2);
  await assert.rejects(ledger(), /not assigned/);
  await assert.rejects(config(), /not assigned/);
  await identity(student1, "student");
  await assert.rejects(ledger(), /not assigned/);
  await assert.rejects(
    value("select * from assessment_records"),
    /permission denied/,
  );
  await owner();
  await db.exec("set role anon");
  await assert.rejects(ledger(), /permission denied/);
  await identity(teacher1);
  assert.equal((await ledger()).plan, null);
});
test("class receives an isolated configurable snapshot and rejects invalid trees", async () => {
  await identity(teacher1);
  for (const p of [
    { ...plan, items: [] },
    { ...plan, items: [...plan.items, plan.items[0]] },
    { ...plan, items: [{ id: "bad", label: "Bad", maxScore: -1 }] },
    {
      ...plan,
      items: [
        { id: "bad", label: "Bad", maxScore: 10, children: [plan.items[0]] },
      ],
    },
  ])
    await assert.rejects(config(p));
  await config();
  assert.deepEqual((await ledger()).plan, plan);
  await assert.rejects(config(plan, 0), /changed/);
});
test("blank versus zero, patches, numeric bounds and computed group restrictions", async () => {
  await identity(teacher1);
  await save(0, { progress_report: 0, code: null });
  let row = await getRow();
  assert.equal(row.scores.progress_report, 0);
  assert.equal(row.scores.code, null);
  assert.equal(row.version, 1);
  for (const scores of [
    { code: 26 },
    { code: -1 },
    { code: 0.001 },
    { code: "2" },
    { unknown: 1 },
    { final_report: 50 },
  ])
    await assert.rejects(save(1, scores));
  await save(1, { code: 12.5 });
  row = await getRow();
  assert.equal(row.scores.progress_report, 0);
  assert.equal(row.scores.code, 12.5);
  await assert.rejects(save(1, { code: 25 }), /another window/);
  assert.equal((await getRow()).scores.code, 12.5);
});
test("assessment freezes after first record and template updates do not rewrite history", async () => {
  await identity(teacher1);
  assert.equal((await ledger()).locked, true);
  await assert.rejects(config(plan, 1), /locked/);
  await owner();
  await db.query(
    "update assessment_templates set config=jsonb_set(config,'{name}','\"Future template\"') where id='nit3004.v1'",
  );
  await identity(teacher1);
  assert.equal((await ledger()).plan.name, "NIT3004 Assessment");
});
test("student identity and class cannot be mixed; audit is immutable to callers", async () => {
  await identity(teacher1);
  await assert.rejects(
    save(0, {}, null, "99999999-0000-0000-0000-000000000000"),
    /not enrolled/,
  );
  await assert.rejects(
    value("delete from assessment_audit returning id"),
    /permission denied/,
  );
  const history = await value("select get_assessment_history($1,$2)", [
    classId,
    roster,
  ]);
  assert.equal(history.length, 2);
  assert.equal(history[0].after_value.version, 2);
});
test("feedback drafts, teacher notes and confirmations remain teacher-only", async () => {
  await identity(teacher1);
  const comments = {
    final_report: {
      notes: "Teacher observed API explanation.",
      feedback: "Explain your error handling more clearly.",
      aiDraft: "Not adopted AI suggestion",
      confirmed: true,
      extra: "Do not keep",
    },
  };
  await save(2, {}, comments);
  const row = await getRow();
  assert.equal(row.comments.final_report.confirmed, true);
  assert.equal(row.comments.final_report.extra, undefined);
  await assert.rejects(
    save(3, {}, { unknown: comments.final_report }),
    /not enabled/,
  );
  await assert.rejects(
    save(3, {}, { final_report: { ...comments.final_report, feedback: "" } }),
    /before confirming/,
  );
  const ctx = await value("select get_assessment_feedback_context($1,$2,$3)", [
    classId,
    roster,
    "final_report",
  ]);
  assert.equal(ctx.teacherMarkingNotes, comments.final_report.notes);
  assert.equal(JSON.stringify(ctx).includes("Not adopted"), false);
  assert.equal(JSON.stringify(ctx).includes("progress_report"), false);
  await identity(student1, "student");
  await assert.rejects(
    value("select get_assessment_feedback_context($1,$2,$3)", [
      classId,
      roster,
      "final_report",
    ]),
    /not assigned/,
  );
});
test("new classes accept a different structure without schema changes", async () => {
  await owner();
  const next = await value(
    "insert into teaching_blocks(academic_year,block_code,course_code,class_code,status) values(2027,'2B4','NIT3004','NEW','planned') returning id",
  );
  await identity();
  const alternate = {
    version: 2,
    name: "Alternate",
    items: [
      {
        id: "portfolio",
        label: "Portfolio",
        maxScore: 60,
        commentEnabled: true,
      },
      { id: "demo", label: "Demo", maxScore: 40 },
    ],
  };
  const result = await value("select set_assessment_plan($1,0,$2)", [
    next,
    alternate,
  ]);
  assert.deepEqual(result.plan, alternate);
  assert.equal((await ledger()).plan.name, "NIT3004 Assessment");
});

test("audit records the actual previous comments and AI context excludes private or stale reviews", async () => {
  await identity(teacher1);
  const previous = (await getRow()).comments;
  await save(
    3,
    {},
    {
      final_report: {
        ...previous.final_report,
        feedback: "Updated teacher feedback",
        confirmed: false,
      },
    },
  );
  const history = await value("select get_assessment_history($1,$2)", [
    classId,
    roster,
  ]);
  assert.deepEqual(history[0].before_value.comments, previous);
  assert.equal(
    history[0].after_value.comments.final_report.feedback,
    "Updated teacher feedback",
  );
  await owner();
  const revision = await value(
    "select summary_revision from student_session_intakes where id=$1",
    [intake],
  );
  await db.query(
    "insert into intake_teacher_reviews(intake_id,private_note,published) values($1,'PRIVATE_REVIEW_NOTE',$2) on conflict(intake_id) do update set private_note=excluded.private_note,published=excluded.published",
    [
      intake,
      {
        summaryRevision: revision,
        teacherName: "Private identity",
        feedback: "OBSERVED_CODE",
      },
    ],
  );
  await identity(teacher1);
  const context = () =>
    value("select get_assessment_feedback_context($1,$2,$3)", [
      classId,
      roster,
      "final_report",
    ]);
  let ctx = await context();
  assert.equal(ctx.sessions.length, 1);
  assert.equal(
    ctx.sessions[0].studentClaim.claims[0].statement,
    record.claims[0].statement,
  );
  assert.ok(JSON.stringify(ctx).includes("OBSERVED_CODE"));
  assert.doesNotMatch(
    JSON.stringify(ctx),
    /PRIVATE_REVIEW_NOTE|Private identity|Original conversation|debug_events/,
  );
  await owner();
  await db.query(
    "update intake_teacher_reviews set published=jsonb_set(published,'{summaryRevision}',to_jsonb($2::integer)) where intake_id=$1",
    [intake, revision + 1],
  );
  await identity(teacher1);
  ctx = await context();
  assert.equal(ctx.sessions[0].teacherFeedback, null);
});
