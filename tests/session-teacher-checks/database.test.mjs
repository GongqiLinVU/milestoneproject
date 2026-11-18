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

const checkMigration = fs.readFileSync("supabase/migrations/20261118_session_teacher_checks.sql", "utf8");
await db.exec(checkMigration); await db.exec(checkMigration);
const get = () => value("select get_session_teacher_check($1)", [intake]);
const states = () => value("select get_teacher_session_progress_states($1)", [session]);
const mark = (version, revision=1, level=null, comment="") => value("select mark_session_teacher_check($1,$2,$3,$4,$5)", [intake,version,revision,level,comment]);
test("reads never create checks; optional check is separate from AI, formal nodes and legacy feedback", async () => {
  await identity(teacher1);
  assert.equal((await get()).check,null);
  assert.equal((await states())[0].aiStatus,"empty");
  assert.equal((await states())[0].checkCurrent,false);
  const c = await mark(0);
  assert.equal(c.check.current,true); assert.equal(c.check.level,null); assert.equal(c.check.comment,"");
  assert.equal(c.history.length,1); assert.equal((await states())[0].checkCurrent,true);
  await owner();
  assert.equal(await value("select count(*)::int from teacher_node_reviews"),0);
  assert.equal(await value("select count(*)::int from intake_teacher_reviews"),0);
  assert.equal(await value("select count(*)::int from studio_review_ai"),0);
});
test("own student reads public feedback but cannot write; other students and unassigned teachers cannot access", async () => {
  await identity(student1,"student");
  const c = await get(); assert.equal(c.check.teacherName,"Assigned teacher");
  assert.ok(!JSON.stringify(c).includes(teacher1));
  await assert.rejects(mark(1));
  await assert.rejects(states());
  await assert.rejects(db.query("select * from session_teacher_checks"));
  await identity(student2,"student"); await assert.rejects(get());
  await identity(teacher2); await assert.rejects(get()); await assert.rejects(mark(1));
  await identity(null,"anon"); await assert.rejects(get());
});
test("validates input, optimistic version conflicts preserve previous check and history", async () => {
  await identity(teacher1);
  await assert.rejects(mark(1,1,"excellent"),/supported/);
  await assert.rejects(mark(1,1,null,"x".repeat(2001)),/2000/);
  await assert.rejects(mark(0),/another window/);
  const c=await mark(1,1,"needs_attention","  Show the test results.  ");
  assert.equal(c.version,2); assert.equal(c.check.comment,"Show the test results.");
  assert.equal(c.history.length,2); assert.equal(c.history[1].comment,"");
});
test("summary revision invalidates check; correction blocks checking; history survives recheck", async () => {
  await owner(); await db.query("update student_session_intakes set summary_revision=2 where id=$1",[intake]);
  await identity(teacher1);
  assert.equal((await get()).check.current,false);
  const s=(await states())[0]; assert.equal(s.checkRevision,1); assert.equal(s.summaryRevision,2); assert.equal(s.checkCurrent,false);
  await assert.rejects(mark(2,1),/summary changed/);
  await owner(); await db.query("update student_session_intakes set correction_opened_at=now() where id=$1",[intake]);
  await identity(teacher1); assert.equal((await states())[0].aiStatus,"paused");
  await assert.rejects(mark(2,2),/reconfirm/);
  await owner(); await db.query("update student_session_intakes set correction_opened_at=null where id=$1",[intake]);
  await identity(teacher1);
  const c=await mark(2,2,"good","Clear explanation.");
  assert.equal(c.check.current,true); assert.equal(c.history.length,3);
});
test("roster AI states follow persisted jobs and current source revision", async () => {
  await owner();
  await db.query("insert into studio_review_ai(intake_id,kind,status,source_fingerprint) select id,'session_check','ready',studio_review_ai_fingerprint(jsonb_build_object('studentRecord',student_record,'summaryRevision',summary_revision),'session_check') from student_session_intakes where id=$1",[intake]);
  await identity(teacher1); assert.equal((await states())[0].aiStatus,"ready");
  await owner(); await db.query("update studio_review_ai set source_fingerprint='old'");
  await identity(teacher1); assert.equal((await states())[0].aiStatus,"stale");
  for(const [status,lease,expected] of [["pending","1 minute","pending"],["pending","-1 minute","interrupted"],["failed","1 minute","failed"]]) {
    await owner(); await db.query("update studio_review_ai set status=$1,lease_until=now()+$2::interval",[status,lease]);
    await identity(teacher1); assert.equal((await states())[0].aiStatus,expected);
  }
  await owner(); await db.query("insert into studio_review_settings(block_id,config) values($1,'{\"sessionAI\":false}') on conflict(block_id) do update set config=excluded.config",[classId]);
  await identity(teacher1); assert.equal((await states())[0].aiStatus,"disabled");
});
