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
const workspace = () => value("select get_core_review_workspace($1)", [intake]);
const claim = (kind = "preparation", refresh = false) =>
  value("select claim_core_review_generation($1,$2,$3)", [
    intake,
    kind,
    refresh,
  ]);
const guide = {
  progress: "Student reports interface changes.",
  feedback: "Verify the implementation.",
  questions: [
    "Show your interface change.",
    "Explain how the request is handled.",
    "Which test checks this change?",
  ],
  currentSession: 1,
  baselineSession: null,
  generatedAt: "2026-11-15T01:00:00Z",
};
const finish = (lease, result = guide, error = null, kind = "preparation") =>
  value("select finish_core_review_generation($1,$2,$3,$4,$5)", [
    intake,
    kind,
    lease,
    result,
    error,
  ]);
const draft = {
  workflow: "core.v1",
  teacherObservation: "PRIVATE_OBSERVATION: I saw the UI; tests not checked.",
  coreSourceObservation: "",
  coreEdited: false,
  coreReview: { confirmedProgress: [], mainIssues: [], nextSteps: [] },
};
const save = (version, d = draft, publish = false) =>
  value("select save_core_teacher_review($1,$2,1,$3,$4,$5)", [
    intake,
    version,
    d,
    "PRIVATE_NOTE",
    publish,
  ]);

test("core review and cache require assigned teacher access; direct tables stay private", async () => {
  await identity(student1, "student");
  await assert.rejects(workspace(), /not assigned/);
  await assert.rejects(claim(), /not assigned/);
  await assert.rejects(save(0), /not assigned/);
  await assert.rejects(
    value("select * from intake_review_generation"),
    /permission denied/,
  );
  await identity(teacher2);
  await assert.rejects(workspace(), /not assigned/);
  await owner();
  await db.exec("set role anon");
  await assert.rejects(workspace(), /permission denied/);
  await identity(teacher1);
  assert.equal((await workspace()).preparation.status, "empty");
});
test("one lease prevents duplicate generation and saved preparation survives reopens and source changes", async () => {
  await identity(teacher1);
  const first = await claim();
  assert.equal(first.state, "claimed");
  assert.equal((await claim()).state, "pending");
  assert.equal((await claim("preparation", true)).state, "pending");
  await assert.rejects(
    finish(first.lease, { ...guide, questions: guide.questions.slice(0, 2) }),
    /exactly three/,
  );
  assert.equal(await finish(first.lease), true);
  assert.equal((await claim()).state, "ready");
  assert.deepEqual((await workspace()).preparation.result, guide);
  await owner();
  await db.query(
    "update student_session_intakes set student_record=jsonb_set(student_record,'{claims,0,statement}','\"New claim after generation\"') where id=$1",
    [intake],
  );
  await identity(teacher1);
  assert.equal((await workspace()).preparation.sourceChanged, true);
  const cached = await claim();
  assert.equal(cached.state, "ready");
  assert.deepEqual(cached.result, guide);
});
test("explicit refresh preserves the old guide until a replacement is stored", async () => {
  await identity(teacher1);
  const next = await claim("preparation", true);
  assert.equal(next.state, "claimed");
  assert.deepEqual((await workspace()).preparation.result, guide);
  const replacement = { ...guide, progress: "Student reports a later change." };
  await finish(next.lease, replacement);
  assert.deepEqual((await workspace()).preparation.result, replacement);
  assert.equal((await workspace()).preparation.sourceChanged, false);
});
test("failed and expired jobs require explicit retry and stale leases cannot replace newer results", async () => {
  await identity(teacher1);
  let job = await claim("preparation", true);
  await finish(job.lease, null, "failed");
  assert.equal((await claim()).state, "failed");
  assert.ok((await workspace()).preparation.result);
  job = await claim("preparation", true);
  await owner();
  await db.query(
    "update intake_review_generation set lease_until=now()-interval '1 second' where intake_id=$1 and kind='preparation'",
    [intake],
  );
  await identity(teacher1);
  assert.equal((await workspace()).preparation.status, "interrupted");
  assert.equal((await claim()).state, "interrupted");
  const retry = await claim("preparation", true);
  assert.notEqual(retry.lease, job.lease);
  assert.equal(await finish(job.lease), false);
  assert.equal(await finish(retry.lease), true);
});
test("formatter context contains the saved teacher observation, not student claims or private notes", async () => {
  await identity(teacher1);
  await assert.rejects(claim("feedback"), /observation first/);
  const c = await save(0);
  assert.equal(c.version, 1);
  const job = await claim("feedback");
  assert.equal(job.source.teacherObservation, draft.teacherObservation);
  assert.doesNotMatch(
    JSON.stringify(job.source),
    /PRIVATE_NOTE|New claim|Original conversation/,
  );
  const result = {
    confirmedProgress: ["You showed the interface."],
    mainIssues: ["Testing was not checked."],
    nextSteps: [],
    clarification: "",
  };
  assert.equal(await finish(job.lease, result, null, "feedback"), true);
  assert.equal((await claim("feedback")).state, "ready");
  assert.equal((await workspace()).review.version, 1);
});
test("one completion publishes only core points; optional next steps, stale drafts and corrections are guarded", async () => {
  await identity(teacher1);
  const points = {
    confirmedProgress: ["You showed the interface."],
    mainIssues: ["Testing was not checked."],
    nextSteps: [],
  };
  const ready = {
    ...draft,
    coreReview: points,
    coreSourceObservation: draft.teacherObservation,
  };
  let c = await save(1, ready, true);
  assert.equal(c.published.workflow, "core.v1");
  assert.deepEqual(c.published.coreReview, points);
  assert.deepEqual(c.published.actions, []);
  assert.doesNotMatch(
    JSON.stringify(c.published),
    /PRIVATE_OBSERVATION|PRIVATE_NOTE|teacherObservation|coreSourceObservation/,
  );
  await identity(student1, "student");
  const studentFeedback = await value(
    "select get_my_intake_teacher_feedback()",
  );
  assert.deepEqual(studentFeedback[0].feedback.coreReview, points);
  assert.doesNotMatch(
    JSON.stringify(studentFeedback),
    /PRIVATE_OBSERVATION|PRIVATE_NOTE/,
  );
  await identity(teacher1);
  const changed = {
    ...ready,
    teacherObservation: "Different teacher observation",
  };
  await save(2, changed);
  await assert.rejects(save(3, changed, true), /observation changed/);
  assert.equal((await workspace()).review.published.reviewVersion, 2);
  c = await save(
    3,
    {
      ...changed,
      coreSourceObservation: changed.teacherObservation,
      coreEdited: true,
    },
    true,
  );
  assert.equal(c.version, 4);
  await assert.rejects(save(3, ready), /another tab/);
  await owner();
  await db.query(
    "update student_session_intakes set correction_opened_at=now() where id=$1",
    [intake],
  );
  await identity(teacher1);
  await assert.rejects(
    save(
      4,
      { ...changed, coreSourceObservation: changed.teacherObservation },
      true,
    ),
    /reconfirm/,
  );
  await owner();
  await db.query(
    "update student_session_intakes set correction_opened_at=null where id=$1",
    [intake],
  );
});
test("legacy drafts and existing suggestions are preserved when converting to core review", async () => {
  await owner();
  const other = await value(
    "insert into student_session_intakes(session_id,block_id,student_id,auth_user_id,schema_version,source_mode,source_conversation,student_record,student_confirmation,confirmed_payload_hash) select session_id,block_id,'correction-two',$1,schema_version,source_mode,source_conversation,student_record,student_confirmation,confirmed_payload_hash from student_session_intakes where id=$2 returning id",
    [student2, intake],
  );
  await identity(teacher1);
  const legacy = {
    mode: "detailed",
    status: "reviewed",
    quickNotes: "Preserve this legacy feedback",
    items: [],
    actions: [],
    suggestion: guide,
  };
  await value("select save_intake_teacher_review($1,0,1,$2,'',false)", [
    other,
    legacy,
  ]);
  let w = await value("select get_core_review_workspace($1)", [other]);
  assert.deepEqual(w.preparation.result, guide);
  await value("select save_core_teacher_review($1,1,1,$2,'',false)", [
    other,
    draft,
  ]);
  w = await value("select get_core_review_workspace($1)", [other]);
  assert.deepEqual(w.legacyDraft, legacy);
  assert.equal(w.review.draft.workflow, "core.v1");
  assert.deepEqual(w.preparation.result, guide);
  const cached = await value(
    "select claim_core_review_generation($1,'preparation',false)",
    [other],
  );
  assert.equal(cached.state, "ready");

});
test("empty completion and oversized or malformed core points are rejected", async () => {
  await identity(teacher1);
  await assert.rejects(
    save(
      4,
      { ...draft, coreSourceObservation: draft.teacherObservation },
      true,
    ),
    /at least one/,
  );
  await assert.rejects(
    save(4, {
      ...draft,
      coreReview: { ...draft.coreReview, mainIssues: ["x".repeat(801)] },
    }),
    /Invalid core feedback point/,
  );
  await assert.rejects(
    save(4, {
      ...draft,
      coreReview: { ...draft.coreReview, nextSteps: ["a", "b", "c"] },
    }),
    /Too many/,
  );
});
