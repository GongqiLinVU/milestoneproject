import {test} from 'node:test';import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://classes.mock.invalid';process.env.SUPABASE_PUBLISHABLE_KEY='mock-public';process.env.SUPABASE_SERVICE_ROLE_KEY='mock-service';
const teacher=(await import('../../../.test-api/api/teacher-accounts.js')).default;
const students=(await import('../../../.test-api/api/student-accounts.js')).default;
const poster=(await import('../../../.test-api/api/poster.js')).default;
const suggestion=(await import('../../../.test-api/api/ai-teaching-suggestion.js')).default;
const classId='20000000-0000-0000-0000-000000000001',userId='10000000-0000-0000-0000-000000000001';
async function run(handler,body,options={}){
 const requests=[],original=globalThis.fetch;
 globalThis.fetch=async(url,init={})=>{
  const path=String(url),method=init.method||'GET';requests.push({path,method});let data={},status=200;
  if(path.includes('/auth/v1/user'))data={id:userId,email:'owner@example.invalid',app_metadata:{role:'teacher'}};
  else if(path.includes('/rpc/get_staff_context'))data={isSuperadmin:options.admin===true,mustChangePassword:options.password===true};
  else if(path.includes('/rpc/can_manage_teaching_class'))data=options.allowed===true;
  else if(path.includes('/rpc/can_manage_student_credentials'))data=options.reset===true;
  else if(path.includes('/rpc/set_teacher_classes')){data=options.registerFailed?{message:'Unknown class'}:null;status=options.registerFailed?400:200;}
  else if(path.includes('/auth/v1/admin/users')){data=options.duplicate?{msg:'Email exists'}:{id:'10000000-0000-0000-0000-000000000009',email:'new@example.invalid'};status=options.duplicate?422:200;}
  else if(path.includes('/teacher_profiles'))data=method==='GET'?{active:options.inactive!==true}:null;
  else if(path.includes('/student_roster'))data=options.roster||[];
  else if(path.includes('/student_accounts'))data=[];
  else if(path.includes('/poster_versions'))data={id:userId,block_id:classId,team_id:userId,storage_path:'private',status:'ready'};
  else if(path.includes('openai.com')||path.includes('/storage/'))throw new Error('Forbidden external side effect in scope test');
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 };
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 try{await handler({method:'POST',headers:{authorization:'Bearer synthetic-token'},body},res);return{res,requests};}finally{globalThis.fetch=original;}
}
test('teacher cannot provision teachers and class spoofing cannot reach student service operations',async()=>{
 const staff=await run(teacher,{action:'create',name:'Teacher',email:'new@example.invalid',classIds:[classId]});assert.equal(staff.res.code,403);assert.ok(!staff.requests.some(r=>r.path.includes('/admin/users')));
 const result=await run(students,{blockId:classId,action:'prepare'});assert.equal(result.res.code,403);assert.ok(!result.requests.some(r=>r.path.includes('/student_roster')||r.path.includes('/admin/users')));
});
test('assigned teacher can prepare an empty own-class roster; reset scope is separately checked',async()=>{
 const own=await run(students,{blockId:classId,action:'prepare'},{allowed:true});assert.equal(own.res.code,200);assert.deepEqual(own.res.body.credentials,[]);
 const prepared=await run(students,{blockId:classId,action:'prepare'},{allowed:true,roster:[{student_id:'s1001',full_name:'Student',vu_email:'student@example.invalid'}]});assert.equal(prepared.res.code,200);assert.equal(prepared.res.body.credentials.length,1);
 const denied=await run(students,{blockId:classId,action:'reset',studentId:'s1001'},{allowed:true,roster:[{student_id:'s1001',full_name:'Student',vu_email:'student@example.invalid'}]});assert.equal(denied.res.code,403);assert.ok(!denied.requests.some(r=>r.path.includes('/admin/users')));
});
test('administrator creates an account once and assignment failure cleans up only that new account',async()=>{
 const body={action:'create',name:'Teacher',email:'new@example.invalid',classIds:[classId]};const ok=await run(teacher,body,{admin:true});assert.equal(ok.res.code,200);assert.ok(ok.res.body.initialPassword.length>=20);assert.equal(ok.requests.filter(r=>r.path.endsWith('/admin/users')&&r.method==='POST').length,1);
 const fail=await run(teacher,body,{admin:true,registerFailed:true});assert.equal(fail.res.code,500);assert.equal(fail.requests.filter(r=>r.method==='DELETE').length,1);assert.equal(fail.res.body.initialPassword,undefined);
 const duplicate=await run(teacher,body,{admin:true,duplicate:true});assert.equal(duplicate.res.code,409);assert.ok(!duplicate.requests.some(r=>r.method==='PUT'||r.method==='DELETE'));
});
test('teacher first-password activation is self-scoped and cannot activate a disabled account',async()=>{
 const good=await run(teacher,{action:'activate',password:'New-long-password-2026'},{password:true});assert.equal(good.res.code,200);assert.ok(good.requests.some(r=>r.path.endsWith('/admin/users/'+userId)&&r.method==='PUT'));
 const disabled=await run(teacher,{action:'activate',password:'New-long-password-2026'},{password:true,inactive:true});assert.equal(disabled.res.code,403);assert.ok(!disabled.requests.some(r=>r.method==='PUT'));
});
test('unassigned teacher cannot obtain a poster signed URL or trigger teaching model calls',async()=>{
 const view=await run(poster,{action:'view',versionId:userId});assert.equal(view.res.code,403);assert.ok(!view.requests.some(r=>r.path.includes('/storage/')));
 const advice=await run(suggestion,{blockId:classId,stage:'starting'});assert.equal(advice.res.code,403);assert.ok(!advice.requests.some(r=>r.path.includes('openai.com')));
});
