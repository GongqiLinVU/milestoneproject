// Opt-in: real React components + isolated SQL, synthetic Auth/API transport only.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';import {db,A,sid,identity,owner} from './fixture.mjs';
const {chromium}=await import(process.env.S10_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));const entry=root+'src/usage-pause-smoke.tsx';
await owner();await db.query("update studio_sessions set intake_mode_override='ai',intake_access='open' where id=$1",[sid(7)]);
await db.exec(await readFile(new URL('../../supabase/migrations/20261015_sprint10_ai03_primary_model.sql',import.meta.url),'utf8'));
let code=await readFile(root+'src/main.tsx','utf8');const a=code.indexOf('const supabase = createClient('),b=code.indexOf('// AI Session Intake authentication:',a);
assert.ok(a>0&&b>a);
code=code.slice(0,a)+`const supabase:any={auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}}),refreshSession:async()=>({data:{session:{access_token:'synthetic'}}})},rpc:async(name:string,args:any)=>{const r=await fetch('/__rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});return r.json();}};\n`+code.slice(b);
code=code.slice(0,code.lastIndexOf('createRoot(document.getElementById'))+`const smokeRoot=createRoot(document.getElementById('root')!);(window as any).__unmountIntake=()=>smokeRoot.unmount();smokeRoot.render(<SessionIntakeModal session={{sessionId:'${sid(7)}',sessionNumber:7,focus:'Progress Review'} as StudentSessionRecord} onClose={()=>{}} onSaved={()=>{}}/>);`;
let queue=Promise.resolve(),calls=0,denial='pricing_not_configured';let browser,server;
try{
 server=await createServer({root,configFile:false,esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5178},plugins:[{name:'isolated-intake-bridge',enforce:'pre',resolveId(id){if(id==='/src/usage-pause-smoke.tsx')return entry;},load(id){if(id===entry)return code;},configureServer(vite){vite.middlewares.use((req,res,next)=>{
  if(req.url==='/api/session-intake-ai'){calls++;res.statusCode=denial?(denial==='usage_limit'?429:503):200;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(denial?{code:denial,stage:'usage_control',fallback:true}:{model:'synthetic',result:{assistantMessage:'Here is your progress summary.',route:'review',readyForReview:true,evidenceUpdates:[]}}));return;}
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
 const reply='I added loading, but I am still working on API error handling.';
 for(const error of ['pricing_not_configured','usage_limit','usage_reconciliation']){
  denial=error;const before=calls;await page.goto('http://127.0.0.1:5178/smoke');await page.locator('.chat-composer textarea').fill(reply);await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText(/We couldn’t get a reply just now/).waitFor();await layout();assert.equal(calls,before+1);assert.equal(await page.locator('.chat-composer textarea').inputValue(),reply);assert.equal(await page.locator('.chat-review-card').count(),0);assert.equal(await page.locator('.chat-message.student').count(),0);assert.match(await page.locator('.chat-composer').innerText(),/Round 1 of up to 8/);console.log('PASS '+error+': retryable composer, exact reply restored, no forced review or consumed round');
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
 denial=null;await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('Confirm this Session record',{exact:true}).waitFor();

 const review=page.locator('.chat-review-card');await review.locator('summary').click();for(const [label,value] of [['Responsibility','Dashboard frontend'],['Progress claim','Added loading state'],['Exact scope','Dashboard loading'],['Evidence reference or demonstration','Demo loading screen'],['How to verify','Open the dashboard while the API is pending'],['Your accepted next action','Implement the API error state'],['Expected evidence','Error-state demo']])await review.getByLabel(label,{exact:true}).fill(value);
 await review.locator('label').filter({hasText:/^Evidence availability/}).locator('select').selectOption('available_now');await review.locator('label').filter({hasText:/^Blocker state/}).locator('select').selectOption('none');await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Confirm Session Intake',exact:true}).click();await page.getByText('Session Intake confirmed. This Session is now read-only.',{exact:true}).waitFor().catch(async e=>{console.error(await page.locator('body').innerText());throw e;});
 await identity();const saved=(await db.query('select get_my_session_intake($1) result',[sid(7)])).rows[0].result;assert.ok(saved.confirmedRecord);await owner();const row=(await db.query('select source_conversation from student_session_intakes where session_id=$1',[sid(7)])).rows[0];assert.equal(row.source_conversation[1].text,reply);assert.equal(row.source_conversation.at(-1).purpose,'review transition');assert.deepEqual(errors,[]);assert.equal(calls,4);await page.reload();await page.getByText('Your confirmed claim',{exact:true}).waitFor();console.log('PASS successful retry → manual correction → SQL confirmation → reload read-only; no additional AI calls');await page.evaluate(()=>window.__unmountIntake());assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');console.log('PASS one message scroll region, composer outside message bounds, background scroll restored on close');
}finally{await browser?.close();await server?.close();await db.close();}
