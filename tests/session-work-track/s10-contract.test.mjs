import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { db, A, B, block, sid, identity, rpc, early, late } from './fixture.mjs';
after(()=>db.close());
// One coherent sequential contract exercise, avoiding shared identity races.
test('S10 Work Track: early/late persistence, selected method, windows and identity isolation',async()=>{
  await identity();
  assert.equal((await rpc("get_my_session_work_track",1)).earlyFormVersion,"compact.v1");
  const saved=await rpc('save_my_session_work_track',1,{...early,completionPercent:100,requirements:late.requirements,helpKind:"No help needed"});
  assert.deepEqual(saved.response,early);
  assert.deepEqual((await rpc('get_my_session_work_track',1)).response,early);
  assert.equal((await rpc('get_my_session_work_track',2)).previousNextFocus,early.nextAction);
  assert.equal((await rpc('get_my_session_work_track',2)).previousCompletion,null);
  const compact={...early,formVersion:'compact.v1',workAreas:['Development','Testing'],progressState:'No progress',helpKind:'Teacher guidance',previousActionStatus:'Not completed',responsibilityCarriedForward:true};
  await rpc('save_my_session_work_track',2,compact);
  assert.deepEqual((await rpc('get_my_session_work_track',2)).response,compact);
  await identity(A,'teacher');
  assert.deepEqual((await rpc('get_teacher_session_work_tracks',2))[0].response.workAreas,compact.workAreas);
  await identity();
  for(const bad of [{...compact,workAreas:[]},{...compact,workAreas:['Development','Development']},{...compact,progressState:'Verified by teacher'},{...compact,support:''},{...compact,formVersion:null},{...compact,previousActionStatus:'Verified'}]) {
    await assert.rejects(rpc('save_my_session_work_track',2,bad),/Choose valid Work Track/);
  }
  const noHelp=await rpc('save_my_session_work_track',2,{...compact,helpKind:'No help needed',support:'stale help'});
  assert.equal(noHelp.response.support,'');

  await assert.rejects(rpc('save_my_session_work_track',2,{...early,nextAction:''}),/Describe your responsibility/);
  await assert.rejects(rpc('save_my_session_work_track',2,{...early,evidence:{fake:true}}),/Describe your responsibility/);
  await rpc('save_my_session_work_track',7,{...late,completionPercent:99});
  assert.equal((await rpc('get_my_session_work_track',7)).response.completionPercent,50);
  await identity(A,'teacher');
  assert.equal((await rpc('get_teacher_session_work_tracks',1))[0].response.progress,early.progress);
  await db.query(`select verify_teacher_session_work_track($1,'s1001',50,null)`,[sid(7)]);
  await identity();
  await rpc('save_my_session_work_track',7,late);
  await identity(A,'teacher');
  assert.equal((await rpc('get_teacher_session_work_tracks',7))[0].teacherVerifiedCompletion,null);
  await identity();
  await assert.rejects(rpc('get_teacher_session_work_tracks',1),/Teacher access required/);
  await assert.rejects(rpc('save_my_session_work_track',10,early),/only be updated/);
  await assert.rejects(rpc('get_my_session_work_track',10),/not available/);
  await identity(B);
  await assert.rejects(rpc('save_my_session_work_track',1,early),/only be updated/);
  await assert.rejects(rpc('get_my_session_work_track',1),/not available/);
  assert.deepEqual((await db.query('select * from student_session_work_tracks')).rows,[]);
  await db.exec('reset role');
  await db.query('update student_roster set block_id=$1 where student_id=$2',[block,'s1002']);
  await identity(B);
  assert.deepEqual((await rpc('get_my_session_work_track',1)).response,{});
  await rpc('save_my_session_work_track',1,{...early,responsibility:'Other student role'});
  await identity();
  assert.equal((await rpc('get_my_session_work_track',1)).response.responsibility,early.responsibility);
  await db.exec('reset role');
  await db.query(`update studio_sessions set work_track_access='closed' where id=$1`,[sid(1)]);
  await identity();
  await assert.rejects(rpc('save_my_session_work_track',1,early),/only be updated/);
  assert.equal((await rpc('get_my_session_work_track',1)).isOpen,false);
  await db.exec('reset role');
  await db.query(`update studio_sessions set work_track_access='open' where id=$1`,[sid(1)]);
  for(const mode of ['deterministic','ai']) {
    await db.exec('reset role');
    await db.query(`update teaching_blocks set intake_mode=$1 where id=$2`,[mode,block]);
    await identity();
    await assert.rejects(rpc('save_my_session_work_track',1,early),/only be updated/);
    const history=await rpc('get_my_session_work_track',1);
    assert.equal(history.isOpen,false); assert.deepEqual(history.response,early);
    const journey=(await db.query('select get_my_session_journey() result')).rows[0].result;
    assert.equal(journey.find(s=>s.sessionNumber===1).workTrackStatus,'closed');
  }
  await db.exec('reset role');
  await db.query(`update teaching_blocks set intake_mode='disabled' where id=$1`,[block]);
  await db.exec('set role anon');
  await assert.rejects(rpc('get_my_session_work_track',1),/permission denied/);
  await assert.rejects(db.query('select get_my_session_journey()'),/permission denied/);
  await assert.rejects(rpc('save_my_session_work_track',1,early),/permission denied/);
  await db.exec('reset role');
  await identity();
});
