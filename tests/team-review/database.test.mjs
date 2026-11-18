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


const meetingMigration=fs.readFileSync('supabase/migrations/20261119_team_review_meetings.sql','utf8');
await db.exec(meetingMigration);await db.exec(meetingMigration);
const openMeeting=(fresh=false)=>value("select open_teacher_team_meeting($1,1,'r2',$2)",[classId,fresh]);
const read=()=>value('select get_teacher_team_meeting($1)',[meeting.id]);
const save=()=>value('select save_teacher_team_meeting($1,$2,$3)',[meeting.id,meeting.version,JSON.stringify(draft)]);
const publish=targets=>value('select publish_teacher_team_members($1,$2,$3)',[meeting.id,meeting.version,JSON.stringify(targets)]);
const empty=()=>({confirmedProgress:[],mainIssues:[],nextSteps:[]});
let meeting,draft;
await identity(teacher1);
meeting=await openMeeting();draft={participants:[],observation:'',meetingDate:'2026-11-19',feedback:{shared:empty(),members:[],unresolved:[]},feedbackObservation:'',feedbackParticipants:[],feedbackEdited:false};
test('team opens with frozen roster/sources, no assumed attendance and no completed individual reviews',async()=>{
 assert.equal(meeting.members.length,2);assert.equal(meeting.participants.length,0);
 assert.ok(meeting.sources['correction-one'].updates.length);
 assert.equal((await openMeeting()).id,meeting.id);
 const hub=await value('select get_studio_review_hub($1)',[classId]);assert.equal(hub.teamMeetings.length,1);
 assert.equal(hub.reviews.length,0);
 await assert.rejects(value('select save_studio_review_settings($1,0,$2)',[classId,JSON.stringify({...hub.config,nodes:hub.config.nodes.map(n=>({...n,label:'Changed'}))})]),/locked/);
});
test('only assigned teachers can access meeting notes, histories and AI context',async()=>{
 for(const [uid,role] of [[student1,'student'],[student2,'student'],[teacher2,'teacher']]){
  await identity(uid,role);await assert.rejects(read());await assert.rejects(openMeeting());await assert.rejects(value('select list_teacher_team_meetings($1)',[classId]));
  await assert.rejects(value("select claim_team_meeting_ai($1,'guide')",[meeting.id]));
  await assert.rejects(db.query('select * from teacher_review_meetings'));
 }
 await identity(teacher1);
});
test('save validates attendance and attribution; stale window conflicts retain the stored meeting',async()=>{
 draft={...draft,participants:['correction-one'],observation:'Team demonstrated search. correction-one explained the search module. Request a mobile test next session.',feedback:{shared:{...empty(),confirmedProgress:['Team demonstrated search.']},members:[{studentId:'correction-one',...empty(),confirmedProgress:['Explained the search module.']}],unresolved:['Who prepared the test cases?']}};
 await assert.rejects(value('select save_teacher_team_meeting($1,$2,$3)',[meeting.id,meeting.version,JSON.stringify({...draft,participants:['outsider']})]),/participant/);
 await assert.rejects(value('select save_teacher_team_meeting($1,$2,$3)',[meeting.id,meeting.version,JSON.stringify({...draft,feedback:{...draft.feedback,members:[{studentId:'correction-two',...empty(),confirmedProgress:['Absent person work']}]}})]),/participating/);
 meeting=await save();
 await assert.rejects(value('select save_teacher_team_meeting($1,0,$2)',[meeting.id,JSON.stringify(draft)]),/another window/);
 assert.equal((await read()).observation,draft.observation);
 await assert.rejects(publish([{studentId:'correction-one',version:0}]),/latest observation/);
 draft={...draft,feedbackObservation:draft.observation,feedbackParticipants:draft.participants,feedbackEdited:true};meeting=await save();
});
test('confirming one participant preserves individual review compatibility without publishing classmates, raw notes or unresolved attribution',async()=>{
 meeting=await publish([{studentId:'correction-one',version:0}]);
 assert.ok(meeting.confirmed['correction-one']);assert.equal(meeting.confirmed['correction-two'],undefined);
 await owner();assert.equal(await value("select count(*)::int from teacher_node_reviews where student_id='correction-two'"),0);
 await identity(student1,'student');const mine=await value('select get_my_teacher_node_reviews()');
 assert.equal(mine.length,1);assert.deepEqual(mine[0].feedback.coreReview.confirmedProgress,['Explained the search module.']);
 assert.deepEqual(mine[0].feedback.teamFeedback.confirmedProgress,['Team demonstrated search.']);
 const text=JSON.stringify(mine);assert.ok(!text.includes('Who prepared'));assert.ok(!text.includes('Request a mobile'));assert.ok(!text.includes('correction-two'));
 await identity(student2,'student');assert.equal((await value('select get_my_teacher_node_reviews()')).length,0);
 await identity(teacher1);
 await assert.rejects(publish([{studentId:'correction-two',version:0}]),/participating/);
 await assert.rejects(publish([{studentId:'correction-one',version:1}]),/replacement/);
});
test('shared work alone cannot complete an individual; replacement and target-version conflicts are explicit',async()=>{
 draft={...draft,participants:['correction-one','correction-two'],feedbackParticipants:['correction-one','correction-two'],feedback:{...draft.feedback,members:[...draft.feedback.members,{studentId:'correction-two',...empty()}]}};
 meeting=await save();
 await assert.rejects(publish([{studentId:'correction-two',version:0}]),/Personal observations/);
 draft={...draft,feedback:{...draft.feedback,members:draft.feedback.members.map(m=>m.studentId==='correction-two'?{...m,mainIssues:['Test-case design remains unclear.']}:m)}};meeting=await save();
 await assert.rejects(publish([{studentId:'correction-one',version:0,replace:true}]),/Individual review changed/);
 await assert.rejects(publish([{studentId:'correction-one',version:1,replace:true},{studentId:'correction-two',version:9}]),/Individual review changed/);
 assert.equal((await read()).targets.find(t=>t.studentId==='correction-one').version,1);
});
test('source changes and open corrections block confirmation until explicitly refreshed/reconfirmed',async()=>{
 await owner();await db.query("update student_session_intakes set correction_opened_at=now() where id=$1",[intake]);
 await identity(teacher1);await assert.rejects(publish([{studentId:'correction-one',version:1,replace:true}]),/source changed/);
 meeting=await value('select refresh_teacher_team_sources($1,$2)',[meeting.id,meeting.version]);
 await assert.rejects(publish([{studentId:'correction-one',version:1,replace:true}]),/corrections/);
 await owner();await db.query('update student_session_intakes set correction_opened_at=null,summary_revision=summary_revision+1 where id=$1',[intake]);
 await identity(teacher1);meeting=await value('select refresh_teacher_team_sources($1,$2)',[meeting.id,meeting.version]);
 meeting=await publish([{studentId:'correction-one',version:1,replace:true},{studentId:'correction-two',version:0}]);
 assert.equal(Object.keys(meeting.confirmed).length,2);
 await owner();assert.equal(await value("select count(*)::int from teacher_node_review_publications p join teacher_node_reviews r on r.id=p.review_id where r.student_id='correction-one'"),2);
 await identity(teacher1);
});
test('stored AI generation uses leases and fingerprints, rejects absent attribution and stale responses',async()=>{
 const claim=()=>value("select claim_team_meeting_ai($1,'feedback')",[meeting.id]);
 let c=await claim();assert.equal(c.state,'claimed');assert.equal((await claim()).state,'pending');
 await assert.rejects(value("select finish_team_meeting_ai($1,'feedback',$2,$3,null)",[meeting.id,c.lease,JSON.stringify({...draft.feedback,members:[{studentId:'outsider',...empty()}]})]),/participating/);
 assert.equal(await value("select finish_team_meeting_ai($1,'feedback',$2,$3,null)",[meeting.id,c.lease,JSON.stringify(draft.feedback)]),true);
 assert.equal((await claim()).state,'ready');
 draft={...draft,observation:draft.observation+' Additional detail.'};meeting=await save();c=await claim();assert.equal(c.state,'claimed');
 draft={...draft,observation:draft.observation+' More detail.'};meeting=await save();
 assert.equal(await value("select finish_team_meeting_ai($1,'feedback',$2,$3,null)",[meeting.id,c.lease,JSON.stringify(draft.feedback)]),false);
 assert.equal((await read()).jobs.feedback.status,'failed');
 const next=await openMeeting(true);assert.notEqual(next.id,meeting.id);assert.equal(next.participants.length,0);assert.equal(Object.keys(next.confirmed).length,0);
});
test('roster changes retain historical meetings but prevent attributing a new confirmation to a departed member',async()=>{
 await owner();await db.query("update student_roster set team_number=2 where block_id=$1 and student_id='correction-two'",[classId]);
 await identity(teacher1);const retained=await read();
 assert.equal(retained.members.length,2);assert.equal(retained.targets.find(t=>t.studentId==='correction-two').currentMember,false);
 await identity(null,'anon');await assert.rejects(read());await assert.rejects(value("select claim_team_meeting_ai($1,'guide')",[meeting.id]));
});
