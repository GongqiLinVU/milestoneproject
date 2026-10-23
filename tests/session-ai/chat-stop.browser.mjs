// Opt-in: real React components + isolated SQL, synthetic Auth/API transport only.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {decideTurn} from '../../.test-build/intakeHarness.js';
import {createServer} from 'vite';import {db,A,sid,identity,owner} from './fixture.mjs';
import {chatStopDecision,chatStopSaveReason} from '../../.test-api/src/intakeChatStop.js';
import {questionBudget,signQuestion} from '../../.test-api/api/intakeQuestionMeta.js';
const {chromium}=await import(process.env.S10_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));const entry=root+'src/chat-stop-smoke.tsx';
await owner();await db.query("update studio_sessions set intake_mode_override='ai',intake_access='open' where id=$1",[sid(7)]);
await db.exec(await readFile(new URL('../../supabase/migrations/20261015_sprint10_ai03_primary_model.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261019_sprint10_focused_review.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261019_sprint10_unknown_progress.sql',import.meta.url),'utf8'));
let code=await readFile(root+'src/main.tsx','utf8');const a=code.indexOf('const supabase = createClient('),b=code.indexOf('// AI Session Intake authentication:',a);
assert.ok(a>0&&b>a);
code=code.slice(0,a)+`const supabase:any={auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}}),refreshSession:async()=>({data:{session:{access_token:'synthetic'}}})},rpc:async(name:string,args:any)=>{const r=await fetch('/__rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});return r.json();}};\n`+code.slice(b);
code=code.slice(0,code.lastIndexOf('createRoot(document.getElementById'))+`const smokeRoot=createRoot(document.getElementById('root')!);(window as any).__unmountIntake=()=>smokeRoot.unmount();smokeRoot.render(<SessionIntakeModal session={{sessionId:'${sid(7)}',sessionNumber:7,focus:'Progress Review'} as StudentSessionRecord} onClose={()=>{}} onSaved={()=>{}}/>);`;
let queue=Promise.resolve(),chatCalls=0,recordCalls=0,providerCalls=0,scenario='invalid',summaryFailure=false,recordConversation,recordRelease,holdRecord=false;const secret='synthetic-only',binding='student/session';let browser,server;
try{
 server=await createServer({root,configFile:false,esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5178},plugins:[{name:'isolated-intake-bridge',enforce:'pre',resolveId(id){if(id==='/src/chat-stop-smoke.tsx')return entry;},load(id){if(id===entry)return code;},configureServer(vite){vite.middlewares.use((req,res,next)=>{
  if(req.url==='/api/session-intake-ai'){
    let raw='';req.on('data',c=>raw+=c);req.on('end',async()=>{
      const request=JSON.parse(raw);res.setHeader('Content-Type','application/json');
      if(request.mode==='chat'){
        chatCalls++;const budget=questionBudget(secret,binding,request.conversation);
        const p=scenario==='invalid'?null:{assistantMessage:budget.clarificationsUsed?'What is next?':'What remains?',readyForReview:false,reason:'Synthetic gap',target:scenario==='repeat'||budget.clarificationsUsed===0?'work':'next',effect:'Clarify progress'};
        if(budget.clarificationsUsed<2)providerCalls++;
        const d=chatStopDecision(budget,p);const conv=[...request.conversation,{actor:'system',text:d.assistantMessage}];
        const meta=d.readyForReview?undefined:signQuestion(secret,binding,conv,conv.length-1,d.target);
        res.end(JSON.stringify({model:'synthetic',result:{...d,route:d.readyForReview?'review':'continue',evidenceUpdates:[]},questionMeta:meta,rawCandidate:p,chatControl:{intervened:d.intervened,reason:d.reason,budget,proposal:p,final:{route:d.readyForReview?'review':'continue'}}}));return;
      }
      recordCalls++;recordConversation=request.conversation;
      if(holdRecord)await new Promise(resolve=>{recordRelease=resolve;});
      if(summaryFailure){summaryFailure=false;res.statusCode=502;res.end(JSON.stringify({code:'invalid_provider_response',reason:'provider_incomplete',stage:'provider_response'}));return;}
      const candidate={assistantMessage:'Check summary.',route:'review',readyForReview:true,evidenceUpdates:[{field:'responsibility',state:'student_claim',value:'Dashboard frontend',sourceTurn:1,operation:'add',contextTurn:null},...request.conversation.flatMap((t,i)=>t.actor==='student'?[{field:'claim',state:'student_claim',value:t.text,progressKind:'unknown',sourceTurn:i,operation:'add',contextTurn:null}]:[])],nextStep:{status:'unknown',action:null,sourceTurn:request.conversation.length-1,contextTurn:null,expectedEvidence:null,additionalActions:[]}};
      const d=decideTurn(candidate,request.conversation,request.answers);res.end(JSON.stringify({model:'synthetic',result:{...candidate,evidenceUpdates:d.accepted},fieldDecisions:d.decisions}));
    });return;
  }
  if(req.url==='/__rpc'){let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{queue=queue.then(async()=>{try{const {name,args}=JSON.parse(raw);assert.ok(['get_my_session_intake','get_my_session_journey','save_my_session_intake_chat'].includes(name));await identity(A);const keys=Object.keys(args||{}),values=Object.values(args||{}).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);const q='select public.'+name+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+') result';const data=(await db.query(q,values)).rows[0].result;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error:null}));}catch(e){console.error('Synthetic SQL error:',e.message);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{message:e.message}}));}});});return;}
  if(req.url==='/smoke'){res.setHeader('Content-Type','text/html');res.end('<div style="height:2400px">Background Session list</div><div id="root"></div><script type="module" src="/src/chat-stop-smoke.tsx"></script>');return;}next();
 });}}]});await server.listen();
 let executablePath=process.env.S10_CHROMIUM_EXECUTABLE,args=['--no-sandbox'];
 if(process.env.S10_CHROMIUM_MODULE){const c=(await import(process.env.S10_CHROMIUM_MODULE)).default;executablePath=await c.executablePath();args=c.args;}
 browser=await chromium.launch({executablePath,args,headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5178/')?r.continue():r.abort());

 const reply=async text=>{await page.locator('.chat-composer textarea').fill(text);await page.getByRole('button',{name:'Send',exact:true}).click();};
 const restart=async()=>{chatCalls=0;providerCalls=0;recordCalls=0;await page.goto('http://127.0.0.1:5178/smoke');await page.locator('.chat-composer textarea').waitFor();};
 scenario='invalid';await restart();await reply('I worked on the dashboard');await page.getByRole('heading',{name:'Work and progress',exact:true}).waitFor();assert.equal(chatCalls,1);assert.equal(recordCalls,1);assert.equal(recordConversation.at(-1).text,'I worked on the dashboard');console.log('PASS invalid completed chat format transitions to record without restoring/deleting student answer');
 scenario='repeat';await restart();await reply('I worked on dashboard');await page.getByText('What remains?',{exact:true}).waitFor();await reply('Still testing');await page.getByRole('heading',{name:'Work and progress',exact:true}).waitFor();assert.equal(chatCalls,2);assert.equal(recordCalls,1);console.log('PASS returned questionMeta survives UI and repeated target starts review');
 scenario='cap';summaryFailure=true;holdRecord=true;await restart();
 assert.match(await page.locator('.chat-round-guide').innerText(),/at most 2 follow-up/);
 await reply('My role is Dashboard frontend. I completed dashboard loading');await page.getByText('What remains?',{exact:true}).waitFor();
 await reply('Still testing API integration');await page.getByText('What is next?',{exact:true}).waitFor();
 await reply('Finish integration next week');
 const waiting=page.getByRole('region',{name:'Prepare summary'});
 await waiting.getByRole('status').waitFor();assert.equal(await waiting.getByRole('button').count(),0);assert.equal(await page.locator('.chat-message.thinking').count(),0);assert.equal(await page.getByText('Your answers are still here. You can retry or add a correction.',{exact:true}).count(),0);assert.match(await waiting.innerText(),/putting your update together/);assert.equal(await page.locator('.chat-message.student').count(),3);
 for(let i=0;i<1000&&!recordRelease;i++)await new Promise(r=>setTimeout(r,10));assert.equal(typeof recordRelease,'function');
 holdRecord=false;recordRelease();recordRelease=null;
 await page.getByRole('button',{name:'Retry summary',exact:true}).waitFor();assert.equal(await waiting.getByRole('status').count(),0);assert.equal(await waiting.getByRole('button',{name:'Add or correct something',exact:true}).isEnabled(),true);console.log('PASS loading has one clear status and no retry/correction controls; controls appear only on failure');
 assert.equal(providerCalls,2);assert.equal(chatCalls,3);assert.equal(recordCalls,1);assert.equal(await page.locator('.chat-message.student').count(),3);assert.equal(recordConversation.at(-1).text,'Finish integration next week');
 holdRecord=true;await page.getByRole('button',{name:'Retry summary',exact:true}).click();await waiting.getByRole('status').waitFor();assert.equal(await waiting.getByRole('button').count(),0);for(let i=0;i<1000&&!recordRelease;i++)await new Promise(r=>setTimeout(r,10));assert.equal(typeof recordRelease,'function');holdRecord=false;recordRelease();recordRelease=null;await page.getByRole('heading',{name:'Work and progress',exact:true}).waitFor();assert.equal(chatCalls,3);assert.equal(recordCalls,2);
 const review=page.getByRole('region',{name:'Review your check-in'});
 assert.match(await review.innerText(),/Finish integration next week/);
 for(let i=0;i<4&&!await review.getByRole('heading',{name:'Ready to save',exact:true}).count();i++){const title=await review.locator('h3').innerText();await review.getByRole('button',{name:/^(Looks right · Continue|Skip for now)$/}).click();await review.getByRole('heading',{name:title,exact:true}).waitFor({state:'hidden'});}
 await review.getByRole('heading',{name:'Ready to save',exact:true}).waitFor();await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Save check-in',exact:true}).click();await page.getByRole('heading',{name:'Your progress, recorded',exact:true}).waitFor();
 await owner();const row=(await db.query('select source_conversation,ai_assistance from student_session_intakes where session_id=$1',[sid(7)])).rows[0];
 assert.equal(row.source_conversation.filter(t=>t.actor==='student').length,3);assert.ok(row.source_conversation.every(t=>!t.questionMeta));assert.equal(row.ai_assistance.stop_reason,'budget_exhausted');assert.equal(row.ai_assistance.follow_up_count,0);
 await page.reload();await page.getByRole('heading',{name:'Your progress, recorded',exact:true}).waitFor();await page.getByRole('button',{name:/^Intake debug ·/}).click();const debug=JSON.parse(await page.getByLabel('Intake debug JSON',{exact:true}).innerText());assert.ok(debug.harness.observations.some(o=>o.kind==='chat_stop_intervention'&&o.level==='A'&&o.evidence.control.budget.clarificationsUsed===2));assert.equal(debug.harness.summary.observerActionsExecuted,0);assert.equal(chatCalls,3);assert.equal(recordCalls,2);assert.deepEqual(errors,[]);console.log('PASS two clarifications → no third provider call → record-only retry → SQL save → history restores A debug; all three answers retained');
}finally{await browser?.close();await server?.close();await db.close();}
