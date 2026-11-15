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
const coreMigration = fs.readFileSync(
  "supabase/migrations/20261115_core_review_workflow.sql",
  "utf8",
);
await db.exec(coreMigration);
await db.exec(coreMigration);

await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261114_block_assessment_ledger.sql",
    "utf8",
  ),
);
await db.exec(
  "alter table auth.users add column if not exists raw_user_meta_data jsonb default '{}'::jsonb",
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261111_sprint11_student_id_correction.sql",
    "utf8",
  ),
);
const nodesMigration = fs.readFileSync(
  "supabase/migrations/20261115_independent_review_nodes.sql",
  "utf8",
);
await db.exec(nodesMigration);
await db.exec(nodesMigration);
const hub = () => value("select get_studio_review_hub($1)", [classId]);
const open = (sid = "correction-one", key = "r2") =>
  value("select open_teacher_node_review($1,$2,$3)", [classId, sid, key]);
const ws = (id) => value("select get_teacher_node_workspace($1)", [id]);
const draft = {
  meetingDate: "2026-11-12",
  workflow: "core.v1",
  teacherObservation: "I checked the interface; testing remains unverified.",
  coreSourceObservation: "I checked the interface; testing remains unverified.",
  coreEdited: true,
  coreReview: {
    confirmedProgress: ["You demonstrated the interface."],
    mainIssues: ["Testing remains unverified."],
    nextSteps: [],
  },
};
const save = async (id, d = draft, publish = false) => {
  const w = await ws(id);
  return value("select save_teacher_node_review($1,$2,$3,$4,$5,$6)", [
    id,
    w.review.version,
    w.review.summaryRevision,
    d,
    "PRIVATE TEACHER NOTE",
    publish,
  ]);
};
const claim = (id, kind = "node_preparation", refresh = false) =>
  value("select claim_studio_review_ai($1,$2,$3)", [id, kind, refresh]);
const finish = (id, kind, lease, result, error = null) =>
  value("select finish_studio_review_ai($1,$2,$3,$4,$5)", [
    id,
    kind,
    lease,
    result,
    error,
  ]);
const guide = {
  progress: "Student reports an interface.",
  feedback: "Check the code.",
  questions: ["Show the interface.", "Explain the request.", "Show a test."],
};
let rid, s3id, s6id;
test("new class gets visual default nodes without creating reviews; class and student boundaries enforced", async () => {
  await identity(teacher1);
  let h = await hub();
  assert.equal(h.config.nodes.length, 4);
  assert.equal(h.version, 0);
  assert.equal(h.reviews.length, 0);
  await identity(teacher2);
  await assert.rejects(hub(), /not assigned/);
  await identity(student1, "student");
  await assert.rejects(hub(), /not assigned/);
  await owner();
  await db.exec("set role anon");
  await assert.rejects(hub(), /permission denied/);
  await db.exec("reset role");
  for (const table of [
    "teacher_node_reviews",
    "teacher_node_review_publications",
    "studio_review_ai",
    "studio_review_settings",
  ]) {
    await identity(teacher1);
    await assert.rejects(
      db.query("select * from " + table),
      /permission denied/,
    );
  }
});
test("settings save with version guards; source and meeting sessions are independent", async () => {
  await identity(teacher1);
  let h = await hub();
  const c = structuredClone(h.config);
  c.nodes[1].label = "Code review";
  await value("select save_studio_review_settings($1,0,$2)", [classId, c]);
  h = await hub();
  assert.equal(h.version, 1);
  assert.equal(h.config.nodes[1].toSession, 3);
  assert.equal(h.config.nodes[1].suggestedSession, 4);
  await assert.rejects(
    value("select save_studio_review_settings($1,0,$2)", [classId, c]),
    /Settings changed/,
  );
  c.nodes[1].suggestedSession = 2;
  await assert.rejects(
    value("select save_studio_review_settings($1,1,$2)", [classId, c]),
    /Meeting must/,
  );
});
test("node snapshots include only this student and the configured cutoff, not future sessions", async () => {
  await owner();
  s3id = await value(
    "insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Session Three',current_date,3,'closed') returning id",
    [classId],
  );
  s6id = await value(
    "insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Session Six',current_date,6,'open') returning id",
    [classId],
  );
  for (const [sessionId, text] of [
    [s3id, "S3 evidence"],
    [s6id, "FUTURE S6 SECRET"],
  ])
    await db.query(
      "insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,student_confirmation,confirmed_payload_hash) select $1,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,jsonb_set(student_record,'{claims,0,statement}',to_jsonb($3::text)),student_confirmation,confirmed_payload_hash from student_session_intakes where id=$2",
      [sessionId, intake, text],
    );
  await identity(teacher1);
  rid = await open();
  assert.equal(await open(), rid);
  let w = await ws(rid);
  assert.deepEqual(
    w.review.sourceSnapshot.updates.map((x) => x.sessionNumber),
    [1, 3],
  );
  assert.deepEqual(w.review.sourceSnapshot.missingSessions, [2]);
  assert.equal(JSON.stringify(w).includes("FUTURE S6 SECRET"), false);
  const noIntake = await open("correction-two");
  const blank = await ws(noIntake);
  assert.equal(blank.review.studentRecord, null);
  assert.equal(blank.review.sourceSnapshot.updates.length, 0);
  await save(noIntake, draft, true);
  assert.equal((await ws(noIntake)).review.published.node.id, "r2");
  await identity(student1, "student");
  await assert.rejects(ws(rid), /not assigned/);
  await identity(teacher2);
  await assert.rejects(ws(rid), /not assigned/);
});
test("started node definitions lock, but new nodes may be added", async () => {
  await identity(teacher1);
  const h = await hub(),
    c = structuredClone(h.config);
  c.nodes[1].toSession = 2;
  await assert.rejects(
    value("select save_studio_review_settings($1,$2,$3)", [
      classId,
      h.version,
      c,
    ]),
    /definitions are locked/,
  );
  c.nodes[1].toSession = 3;
  c.nodes.push({
    id: "extra",
    label: "Extra review",
    fromSession: 1,
    toSession: 3,
    suggestedSession: 5,
    includePreviousBlock: false,
  });
  await value("select save_studio_review_settings($1,$2,$3)", [
    classId,
    h.version,
    c,
  ]);
  assert.equal((await hub()).config.nodes.length, 5);
});
test("preparation is cached with one lease, and formatter source is teacher-only", async () => {
  await identity(teacher1);
  const c = await claim(rid);
  assert.equal(c.state, "claimed");
  assert.equal((await claim(rid)).state, "pending");
  assert.equal(c.source.updates.length, 2);
  await finish(rid, "node_preparation", c.lease, guide);
  assert.equal((await claim(rid)).state, "ready");
  await save(rid);
  const f = await claim(rid, "node_feedback");
  assert.equal(f.source.teacherObservation, draft.teacherObservation);
  assert.equal(
    JSON.stringify(f.source).includes("PRIVATE TEACHER NOTE"),
    false,
  );
  assert.equal(f.source.studentRecord, undefined);
  await finish(rid, "node_feedback", f.lease, {
    ...draft.coreReview,
    clarification: "",
  });
  assert.equal((await ws(rid)).review.version, 1);
});
test("publication is node-owned, private fields excluded, and sessions are not modified", async () => {
  await owner();
  const before = await value("select count(*) from intake_teacher_reviews");
  await identity(teacher1);
  await save(rid, draft, true);
  const w = await ws(rid);
  assert.equal(w.review.published.node.id, "r2");
  assert.equal(w.review.published.reviewedOn, "2026-11-12");
  assert.deepEqual(w.review.published.coreReview.nextSteps, []);
  assert.equal(w.review.publications.length, 1);
  await owner();
  assert.equal(
    await value("select count(*) from intake_teacher_reviews"),
    before,
  );
  await identity(student1, "student");
  const student = await value("select get_my_teacher_node_reviews()");
  assert.equal(student.length, 1);
  assert.equal(JSON.stringify(student).includes("PRIVATE TEACHER NOTE"), false);
  assert.equal(JSON.stringify(student).includes("teacherObservation"), false);
  assert.equal(JSON.stringify(student).includes("source_snapshot"), false);
  await identity(student2, "student");
  assert.equal(
    (await value("select get_my_teacher_node_reviews()")).some(
      (r) => r.id === rid,
    ),
    false,
  );
});
test("source refresh is explicit, rejects stale tabs, preserves published snapshots and prior generation", async () => {
  await owner();
  await db.query(
    "update student_session_intakes set student_record=jsonb_set(student_record,'{claims,0,statement}','\"Changed after publication\"'),summary_revision=summary_revision+1 where id=$1",
    [intake],
  );
  await identity(teacher1);
  let w = await ws(rid);
  const frozen = structuredClone(w.review.publications[0]);
  assert.equal(w.review.sourceChanged, true);
  await assert.rejects(save(rid, draft, true), /Source records changed/);
  const version = w.review.version;
  w = await value("select refresh_teacher_node_sources($1,$2)", [rid, version]);
  assert.equal(w.review.sourceChanged, false);
  assert.deepEqual(w.review.publications[0], frozen);
  assert.equal(w.preparation.sourceChanged, true);
  assert.equal((await claim(rid)).state, "ready");
  await assert.rejects(
    value("select refresh_teacher_node_sources($1,$2)", [rid, version]),
    /Review changed/,
  );
  await assert.rejects(
    value("select save_teacher_node_review($1,$2,1,$3,'',false)", [
      rid,
      version,
      draft,
    ]),
    /snapshot changed/,
  );
});
test("open corrections prevent completion even after refreshing sources", async () => {
  await owner();
  await db.query(
    "update student_session_intakes set correction_opened_at=now() where id=$1",
    [intake],
  );
  await identity(teacher1);
  let w = await ws(rid);
  w = await value("select refresh_teacher_node_sources($1,$2)", [
    rid,
    w.review.version,
  ]);
  assert.equal(w.review.correctionOpen, true);
  await assert.rejects(save(rid, draft, true), /corrections/);
  await owner();
  await db.query(
    "update student_session_intakes set correction_opened_at=null where id=$1",
    [intake],
  );
});
test("session AI checks are own-student or assigned-teacher only, stored separately from teacher review", async () => {
  await identity(student1, "student");
  const c = await claim(intake, "session_check");
  assert.equal(c.state, "claimed");
  assert.equal(
    c.source.studentRecord.claims[0].statement,
    "Changed after publication",
  );
  assert.equal(c.source.teacherObservation, undefined);
  const output = {
    summary: "Student reports interface changes.",
    attentionPoints: ["Tests remain unverified."],
    questions: [],
  };
  await finish(intake, "session_check", c.lease, output);
  assert.deepEqual(
    (await value("select get_session_ai_check($1)", [intake])).result,
    output,
  );
  assert.equal((await claim(intake, "session_check")).state, "ready");
  assert.equal((await claim(intake, "session_check", true)).state, "ready");
  await identity(student2, "student");
  await assert.rejects(
    value("select get_session_ai_check($1)", [intake]),
    /not assigned/,
  );
  await assert.rejects(claim(intake, "session_check"), /not assigned/);
  await identity(teacher2);
  await assert.rejects(claim(intake, "session_check"), /not assigned/);
});
test("failed/expired AI work requires explicit retry, and stale leases cannot win", async () => {
  await identity(teacher1);
  const c = await claim(rid, "node_preparation", true);
  await finish(rid, "node_preparation", c.lease, null, "provider error");
  assert.equal((await claim(rid)).state, "failed");
  let c2 = await claim(rid, "node_preparation", true);
  await owner();
  await db.query(
    "update studio_review_ai set lease_until=now()-interval '1 second' where review_id=$1 and kind='node_preparation'",
    [rid],
  );
  await identity(teacher1);
  assert.equal((await claim(rid)).state, "interrupted");
  const c3 = await claim(rid, "node_preparation", true);
  assert.equal(await finish(rid, "node_preparation", c2.lease, guide), false);
  assert.equal(await finish(rid, "node_preparation", c3.lease, guide), true);
});
test("session AI can be disabled without deleting its cache; configuration remains versioned", async () => {
  await identity(teacher1);
  const h = await hub();
  await value("select save_studio_review_settings($1,$2,$3)", [
    classId,
    h.version,
    { ...h.config, sessionAI: false },
  ]);
  await identity(student1, "student");
  assert.equal(
    (await value("select get_session_ai_check($1)", [intake])).status,
    "disabled",
  );
  await assert.rejects(claim(intake, "session_check"), /disabled/);
});
test("R1 explicitly links accessible previous-class evidence and excludes unrelated students", async () => {
  await owner();
  const prev = await value(
    "insert into teaching_blocks(academic_year,block_code,course_code,class_code,status) values(2026,'2B3','NIT3003','C1','archived') returning id",
  );
  await identity();
  await db.query("select set_teacher_classes($1,$2,$3)", [
    teacher1,
    [classId, prev],
    "Teacher",
  ]);
  await owner();
  const ps = await value(
    "insert into studio_sessions(block_id,title,session_date,session_number,status) values($1,'Previous class session',current_date,1,'closed') returning id",
    [prev],
  );
  await db.query(
    "insert into student_roster(block_id,student_id,full_name,team_number) values($1,'correction-one','Returning student',1)",
    [prev],
  );
  await db.query(
    "insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,student_confirmation,confirmed_payload_hash) select $1,$2,student_id,auth_user_id,schema_version,source_mode,source_conversation,jsonb_set(student_record,'{claims,0,statement}','\"PREVIOUS CLASS EVIDENCE\"'),student_confirmation,confirmed_payload_hash from student_session_intakes where id=$3",
    [ps, prev, intake],
  );
  await identity(teacher1);
  const h = await hub();
  await value("select save_studio_review_settings($1,$2,$3)", [
    classId,
    h.version,
    { ...h.config, previousBlockId: prev },
  ]);
  const id = await open("correction-one", "r1");
  const w = await ws(id);
  assert.equal(w.review.sourceSnapshot.previousBlockRecords.length, 1);
  assert.equal(
    w.review.sourceSnapshot.previousBlockRecords[0].studentRecord.claims[0]
      .statement,
    "PREVIOUS CLASS EVIDENCE",
  );
  const other = await open("correction-two", "r1");
  assert.equal(
    (await ws(other)).review.sourceSnapshot.previousBlockRecords.length,
    0,
  );
  const latest = await hub();
  await assert.rejects(
    value("select save_studio_review_settings($1,$2,$3)", [
      classId,
      latest.version,
      { ...latest.config, previousBlockId: null },
    ]),
    /link is locked/,
  );
});
test("later nodes use published teacher conclusions as baseline, not private drafts", async () => {
  await identity(teacher1);
  const id = await open("correction-one", "r3");
  const w = await ws(id);
  assert.equal(w.review.sourceSnapshot.baselineFeedback.node.id, "r2");
  assert.equal(
    JSON.stringify(w.review.sourceSnapshot.baselineFeedback).includes(
      "PRIVATE TEACHER NOTE",
    ),
    false,
  );
  assert.deepEqual(
    w.review.sourceSnapshot.updates.map((x) => x.sessionNumber),
    [6],
  );
});
test("assessment assistance receives only published independent teacher reviews, not node drafts or private notes", async () => {
  await identity(teacher1);
  const plan = JSON.parse(
    fs.readFileSync("src/defaultAssessment.json", "utf8"),
  );
  await value("select set_assessment_plan($1,0,$2)", [classId, plan]);
  await owner();
  const rosterId = await value(
    "select id from student_roster where block_id=$1 and student_id='correction-one'",
    [classId],
  );
  await identity(teacher1);
  const context = await value(
    "select get_assessment_feedback_context($1,$2,'final_report')",
    [classId, rosterId],
  );
  assert.equal(context.teacherNodeReviews.length, 1);
  assert.equal(context.teacherNodeReviews[0].node.id, "r2");
  assert.equal(
    JSON.stringify(context.teacherNodeReviews).includes("PRIVATE TEACHER NOTE"),
    false,
  );
  assert.equal(
    JSON.stringify(context.teacherNodeReviews).includes("teacherObservation"),
    false,
  );
});
test("a new confirmed revision receives a new session check while baseline changes alone do not regenerate it", async () => {
  await identity(teacher1);
  let h = await hub();
  await value("select save_studio_review_settings($1,$2,$3)", [
    classId,
    h.version,
    { ...h.config, sessionAI: true },
  ]);
  await owner();
  const s6 = await value(
    "select id from student_session_intakes where session_id=$1",
    [s6id],
  );
  await identity(student1, "student");
  const c = await claim(s6, "session_check");
  assert.equal(c.source.teacherBaseline.node.id, "r2");
  const output = {
    summary: "Student reports S6 work.",
    attentionPoints: [],
    questions: [],
  };
  await finish(s6, "session_check", c.lease, output);
  assert.equal((await claim(s6, "session_check")).state, "ready");
  await owner();
  const a = await value(
    'select studio_review_ai_fingerprint(\'{"studentRecord":{},"summaryRevision":1,"teacherBaseline":{"x":1}}\',\'session_check\')',
  );
  const b = await value(
    'select studio_review_ai_fingerprint(\'{"studentRecord":{},"summaryRevision":1,"teacherBaseline":{"x":2}}\',\'session_check\')',
  );
  assert.equal(a, b);
  await db.query(
    "update student_session_intakes set summary_revision=summary_revision+1 where id=$1",
    [s6],
  );
  await identity(student1, "student");
  assert.equal((await claim(s6, "session_check")).state, "claimed");
});

test("administrator student-ID correction preserves independent reviews and ownership", async () => {
  await identity();
  await value(
    "select correct_student_id('correction-two','corrected-two','Correct identity for regression check')",
  );
  await identity(teacher1);
  const h = await hub();
  assert.equal(
    h.reviews.some((r) => r.studentId === "correction-two"),
    false,
  );
  assert.equal(
    h.reviews.some((r) => r.studentId === "corrected-two"),
    true,
  );
  await identity(student2, "student");
  assert.ok((await value("select get_my_teacher_node_reviews()")).length > 0);
});
