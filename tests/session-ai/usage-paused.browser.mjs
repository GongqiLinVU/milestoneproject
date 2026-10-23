// Opt-in: real React components + isolated SQL, synthetic Auth/API transport only.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {decideTurn} from '../../.test-build/intakeHarness.js';
import {createServer} from 'vite';import {db,A,sid,identity,owner} from './fixture.mjs';
const {chromium}=await import(process.env.S10_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));const entry=root+'src/usage-pause-smoke.tsx';
await owner();await db.query("update studio_sessions set intake_mode_override='ai',intake_access='open' where id=$1",[sid(7)]);
await db.exec(await readFile(new URL('../../supabase/migrations/20261015_sprint10_ai03_primary_model.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261019_sprint10_focused_review.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261019_sprint10_unknown_progress.sql',import.meta.url),'utf8'));
let code=await readFile(root+'src/main.tsx','utf8');const a=code.indexOf('const supabase = createClient('),b=code.indexOf('// AI Session Intake authentication:',a);
assert.ok(a>0&&b>a);
code=code.slice(0,a)+`const supabase:any={auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}}),refreshSession:async()=>({data:{session:{access_token:'synthetic'}}})},rpc:async(name:string,args:any)=>{const r=await fetch('/__rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});return r.json();}};\n`+code.slice(b);
code=code.slice(0,code.lastIndexOf('createRoot(document.getElementById'))+`const smokeRoot=createRoot(document.getElementById('root')!);(window as any).__unmountIntake=()=>smokeRoot.unmount();smokeRoot.render(<SessionIntakeModal session={{sessionId:'${sid(7)}',sessionNumber:7,focus:'Progress Review'} as StudentSessionRecord} onClose={()=>{}} onSaved={()=>{}}/>);`;
let queue=Promise.resolve(),calls=0,chatCalls=0,recordCalls=0,summaryFailure=true,denial='pricing_not_configured';const autoReview=process.env.S10_AUTO_REVIEW==='1';let browser,server;
try{
 server=await createServer({root,configFile:false,esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5178},plugins:[{name:'isolated-intake-bridge',enforce:'pre',resolveId(id){if(id==='/src/usage-pause-smoke.tsx')return entry;},load(id){if(id===entry)return code;},configureServer(vite){vite.middlewares.use((req,res,next)=>{
  if(req.url==='/api/session-intake-ai'){
    calls++;let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{
      res.statusCode=denial?(denial==='usage_limit'?429:denial==='invalid_provider_response'?502:503):200;res.setHeader('Content-Type','application/json');
      const request=JSON.parse(raw);
      if(request.mode==='chat')chatCalls++;else if(request.mode==='record')recordCalls++;else throw new Error('Student UI must use split tasks');
      if(!denial&&request.mode==='chat'){
        res.end(JSON.stringify({model:'synthetic',manifest:{task:'conversation'},result:{assistantMessage:autoReview?'Check your summary.':'What would you like to add?',readyForReview:autoReview,route:'clarification',reason:'Synthetic continuing reply',evidenceUpdates:[]}}));return;
      }
      if(!denial&&request.mode==='record'&&summaryFailure){summaryFailure=false;res.statusCode=502;res.end(JSON.stringify({code:'invalid_provider_response',stage:'provider_response',reason:'provider_incomplete',diagnostics:{task:'record',incompleteReason:'max_output_tokens'}}));return;}

      const candidate={assistantMessage:'Review your loading work and the spacing change.',route:'review',readyForReview:true,nextStep:{status:'unknown',action:null,expectedEvidence:null,sourceTurn:1,contextTurn:null},evidenceUpdates:[
        {field:'responsibility',value:'Dashboard frontend',state:'student_claim',sourceTurn:1},
        {field:'claim',value:'Added loading state',state:'student_claim',sourceTurn:1,progressKind:'completed'},
        {field:'claim',value:'Checked spacing at 375px',state:'student_claim',sourceTurn:1,progressKind:'unknown'},
        {field:'evidence',value:'Live demo of loading state',state:'available',sourceTurn:1,evidenceType:'live_demonstration'},
        {field:'testing',value:'Checked spacing at 375px',state:'executed',sourceTurn:1,method:'manual viewport inspection',observedResult:'Spacing is readable at 375px'}
      ]};
      if(request.mode==='record'&&request.conversation.length>2)candidate.evidenceUpdates.push({field:'claim',value:request.conversation.at(-1).text,state:'student_claim',sourceTurn:request.conversation.length-1,progressKind:'unknown'});
      candidate.evidenceUpdates=candidate.evidenceUpdates.map(u=>({...u,operation:'add',contextTurn:null}));
      const decision=decideTurn(candidate,request.conversation,request.answers);
      res.end(JSON.stringify(denial?{code:denial,stage:denial==='invalid_provider_response'?'provider_response':'usage_control',reason:denial==='invalid_provider_response'?'output_parse':undefined,providerRequestId:'synthetic-request',diagnostics:{failureStage:'output_parse',outputCharacters:12},fallback:true}:{model:'synthetic',rawCandidate:candidate,fieldDecisions:decision.decisions,routeDecision:decision.routeDecision,result:{...candidate,...decision,evidenceUpdates:decision.accepted}}));
    });return;
  }
  if(req.url==='/__rpc'){let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{queue=queue.then(async()=>{try{const {name,args}=JSON.parse(raw);assert.ok(['get_my_session_intake','get_my_session_journey','save_my_session_intake_chat'].includes(name));await identity(A);const keys=Object.keys(args||{}),values=Object.values(args||{}).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);const q='select public.'+name+'('+keys.map((k,i)=>k+'=> $'+(i+1)).join(',')+') result';const data=(await db.query(q,values)).rows[0].result;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error:null}));}catch(e){console.error('Synthetic SQL error:',e.message);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:null,error:{message:e.message}}));}});});return;}
  if(req.url==='/smoke'){res.setHeader('Content-Type','text/html');res.end('<div style="height:2400px">Background Session list</div><div id="root"></div><script type="module" src="/src/usage-pause-smoke.tsx"></script>');return;}next();
 });}}]});await server.listen();
 let executablePath=process.env.S10_CHROMIUM_EXECUTABLE,args=['--no-sandbox'];
 if(process.env.S10_CHROMIUM_MODULE){const c=(await import(process.env.S10_CHROMIUM_MODULE)).default;executablePath=await c.executablePath();args=c.args;}
 browser=await chromium.launch({executablePath,args,headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5178/')?r.continue():r.abort());
 const layout=async()=>{
  await page.locator('.chat-messages').evaluate(el=>{el.scrollTop=el.scrollHeight});
  const result=await page.evaluate(()=>{const messages=document.querySelector('.chat-messages'),composer=document.querySelector('.chat-composer'),body=document.body;const m=messages.getBoundingClientRect(),c=composer.getBoundingClientRect(),last=messages.querySelectorAll(".chat-message");return {lastBottom:last[last.length-1]?.getBoundingClientRect().bottom??0,bodyOverflow:getComputedStyle(body).overflow,bodyPosition:getComputedStyle(body).position,pageOverflow:getComputedStyle(document.querySelector('.chat-intake-page')).overflow,mBottom:m.bottom,cTop:c.top,cBottom:c.bottom,height:innerHeight};});
  assert.equal(result.bodyOverflow,'hidden');assert.equal(result.bodyPosition,'fixed');assert.equal(result.pageOverflow,'hidden');assert.ok(result.mBottom<=result.cTop+1);assert.ok(result.lastBottom<=result.cTop+1);assert.ok(result.cBottom<=result.height+1);
 };
 const reply='My responsibility is Dashboard frontend. I added loading and can show a live demo. I checked spacing at 375px; spacing is readable. I am still working on API error handling.';
 for(const error of ['pricing_not_configured','usage_limit','usage_reconciliation','invalid_provider_response']){
  denial=error;const before=calls;await page.goto('http://127.0.0.1:5178/smoke');await page.locator('.chat-composer textarea').fill(reply);await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText(/We couldn’t get a reply just now/).waitFor();await layout();assert.equal(calls,before+1);assert.equal(await page.locator('.chat-composer textarea').inputValue(),reply);assert.equal(await page.locator('.chat-review-card').count(),0);assert.equal(await page.locator('.chat-message.student').count(),0);assert.match(await page.locator('.chat-composer').innerText(),/Reply 1 of up to 3/);console.log('PASS '+error+': retryable composer, exact reply restored, no forced review or consumed round');
  if(error==='invalid_provider_response'){
    await page.getByRole('button',{name:/^Intake debug ·/}).click();
    const trace=JSON.parse(await page.getByLabel('Intake debug JSON',{exact:true}).innerText());
    assert.equal(trace.events.at(-1).response.reason,'output_parse');assert.equal(trace.events.at(-1).response.diagnostics.outputCharacters,12);assert.equal(trace.events.at(-1).response.providerRequestId,'synthetic-request');await page.keyboard.press('Escape');
  }
  if(error==='pricing_not_configured'){
    assert.equal(await page.locator('.llm-debug-panel').count(),0);
    const trigger=page.getByRole('button',{name:/^Intake debug ·/});
    for(const width of [1280,390]){
      await page.setViewportSize({width,height:width===390?600:900});await layout();await page.screenshot({path:width===390?'/tmp/intake-close-mobile.png':'/tmp/intake-close-desktop.png'});await trigger.click();
      const dialog=page.getByRole('dialog',{name:'Intake debug',exact:true});await dialog.waitFor();
      const shown=JSON.parse(await dialog.getByLabel('Intake debug JSON',{exact:true}).innerText());assert.equal(shown.events.length,1);assert.equal(shown.harness.mode,'observation_only');
      const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);const headerBox=await dialog.locator("header").boundingBox(),bodyBox=await dialog.locator("p").boundingBox();assert.ok(headerBox.y+headerBox.height<=bodyBox.y);
      const pending=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download debug JSON',exact:true}).click();const download=await pending;
      assert.equal(download.suggestedFilename(),'session-intake-debug-S7.json');const stream=await download.createReadStream();const chunks=[];for await(const c of stream)chunks.push(c);const saved=JSON.parse(Buffer.concat(chunks).toString());delete saved.exportedAt;delete shown.exportedAt;assert.deepEqual(saved,shown);
      if(width===390)await page.screenshot({path:'/tmp/intake-debug-mobile.png'});
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.locator('.chat-composer textarea').inputValue(),reply);
    }
    await page.setViewportSize({width:1280,height:900});console.log('PASS desktop/mobile header debug: full JSON, matching download, Escape closes, draft preserved');
  }

 }
 denial=null;await page.getByRole('button',{name:'Send',exact:true}).click();
 if(!autoReview){
  await page.getByText('What would you like to add?',{exact:true}).waitFor();assert.equal(chatCalls,5);assert.equal(recordCalls,0);assert.equal(await page.locator('.message-evidence-update').count(),0);
  await page.locator('.chat-composer textarea').fill('I do not know the API cause yet.');await page.getByRole('button',{name:'Review and confirm',exact:true}).click();
 }
 await page.getByRole('button',{name:'Retry summary',exact:true}).waitFor();assert.equal(chatCalls,5);assert.equal(recordCalls,1);assert.equal(await page.locator('.chat-message.student').count(),autoReview?1:2);if(!autoReview)assert.ok((await page.locator('.chat-thread').innerText()).includes('I do not know the API cause yet.'));assert.equal(await page.locator('.chat-composer textarea').count(),0);
 await page.setViewportSize({width:390,height:700});await page.screenshot({path:'/tmp/intake-split-summary-retry.png'});await page.setViewportSize({width:1280,height:900});
 await page.getByRole('button',{name:'Retry summary',exact:true}).click();await page.getByRole('heading',{name:'Work and progress',exact:true}).waitFor();assert.equal(chatCalls,5);assert.equal(recordCalls,2);console.log(autoReview?'PASS model close starts separate summary; failed summary retries only record task':'PASS manual finish includes unsent answer; failed summary preserves both answers and retries only record task');

 const review=page.getByRole('region',{name:'Review your check-in'});
 assert.equal(await review.locator('textarea').count(),0);assert.match(await review.innerText(),/Added loading state/);assert.match(await review.innerText(),/Checked spacing at 375px/);await review.getByRole('button',{name:'Edit',exact:true}).click();assert.equal(await review.getByLabel('Progress state',{exact:true}).inputValue(),'unknown');await review.getByRole('button',{name:'Done editing',exact:true}).click();await page.screenshot({path:'/tmp/intake-focused-progress.png'});
 await review.getByRole('button',{name:'Looks right · Continue',exact:true}).click();await review.getByRole('heading',{name:'Checks and evidence',exact:true}).waitFor();
 assert.equal(await review.locator('textarea').count(),0);await page.setViewportSize({width:390,height:700});await page.screenshot({path:'/tmp/intake-focused-evidence-mobile.png'});
 await review.getByRole('button',{name:'Looks right · Continue',exact:true}).click();await review.getByRole('button',{name:'Skip for now',exact:true}).click();
 await review.getByRole('heading',{name:'Ready to save',exact:true}).waitFor();await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Save check-in',exact:true}).click();
 await page.getByRole('heading',{name:'Your progress, recorded',exact:true}).waitFor().catch(async e=>{console.error(await page.locator('body').innerText());throw e;});

 await identity();const saved=(await db.query('select get_my_session_intake($1) result',[sid(7)])).rows[0].result;assert.ok(saved.confirmedRecord);await owner();const row=(await db.query('select source_conversation from student_session_intakes where session_id=$1',[sid(7)])).rows[0];assert.equal(row.source_conversation[1].text,reply);assert.equal(row.source_conversation.at(-1).purpose,'review transition');assert.deepEqual(errors,[]);assert.equal(calls,7);await page.reload();await page.getByRole('heading',{name:'Your progress, recorded',exact:true}).waitFor();await page.getByRole('button',{name:/^Intake debug ·/}).click();const restored=JSON.parse(await page.getByLabel('Intake debug JSON',{exact:true}).innerText());assert.ok(restored.events.length>=2);assert.equal(restored.conversation[1].text,reply);assert.ok(restored.events.some(e=>e.response?.result));await page.keyboard.press('Escape');assert.equal(saved.confirmedRecord.studentRecord.evidence[0].verification_method,null);assert.equal(saved.confirmedRecord.studentRecord.next_action.action,'');assert.equal(saved.confirmedRecord.studentRecord.claims[0].progress_kind,'unknown');assert.match(saved.confirmedRecord.studentRecord.claims[0].statement,/Added loading state/);assert.match(saved.confirmedRecord.studentRecord.claims[0].statement,/Checked spacing at 375px/);assert.equal(saved.confirmedRecord.studentRecord.testing[0].method,'manual viewport inspection');assert.ok(restored.events.some(e=>e.response?.fieldDecisions?.some(d=>d.recordAfter)));assert.ok(restored.harness.summary.observedRuntimeInterventions>0);assert.ok(restored.events.some(e=>e.mode==='record'&&e.error));assert.equal(chatCalls,5);assert.equal(recordCalls,2);console.log('PASS four focused review steps → SQL save with optional blanks → history reload with restored debug; no placeholders or extra AI calls');await page.evaluate(()=>window.__unmountIntake());assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');console.log('PASS one message scroll region, composer outside message bounds, background scroll restored on close');
}finally{await browser?.close();await server?.close();await db.close();}
