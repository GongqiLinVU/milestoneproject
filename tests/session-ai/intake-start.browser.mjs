// Actual Intake component, synthetic RPC/provider transport. No real accounts,
// database writes or model calls. Requires a local Playwright/Chromium installation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {intakeStart,intakeOpeningText} from '../../.test-build/intakeStart.js';
const {chromium}=await import(process.env.S10_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const entry=root+'src/intake-start-smoke.tsx';
let code=await readFile(root+'src/main.tsx','utf8');
const a=code.indexOf('const supabase = createClient('),b=code.indexOf('// AI Session Intake authentication:',a);
assert.ok(a>0&&b>a);
code=code.slice(0,a)+`const supabase:any={auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}}),refreshSession:async()=>({data:{session:{access_token:'synthetic'}}})},rpc:async(name:string,args:any)=>{const r=await fetch('/__rpc'+location.search,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});return r.json();}};\n`+code.slice(b);
code=code.slice(0,code.lastIndexOf('createRoot(document.getElementById'))+`
const n=Number(new URLSearchParams(location.search).get('session')||1);
const focus=['Project Reconnect & Check-in','Team Alignment & Four-Week Commitment','Project Progress & Work Focus','Progress Pre-check','Progress Review','Review → Action','Application Progress + Technical Implementation Report','Completion Check + Product Verification','Final Readiness'][n-1]||'Progress Review';
createRoot(document.getElementById('root')!).render(<SessionIntakeModal session={{sessionId:'synthetic-'+n,sessionNumber:n,focus} as StudentSessionRecord} onClose={()=>{}} onSaved={()=>{}}/>);`;
let server,browser,ready=true,saved=null;const requests=[];
const record={schema_version:'session-intake.v1.2.0',responsibility:{current:'chat interface',changed:false,previous:null},claims:[{claim_id:'c1',statement:'We have wireframes.',scope:'chat interface',progress_kind:'unknown',completion_percent:null}],evidence:[],testing:[],dependencies:[],blocker:{status:'unknown',description:null,support_requested:null},next_action:{action:'Build a static chat page.',due_session:'S2',expected_evidence:''}};
try{
 server=await createServer({root,configFile:false,esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5184},plugins:[{name:'intake-start-smoke',resolveId(id){if(id==='/src/intake-start-smoke.tsx')return entry;},load(id){if(id===entry)return code;},configureServer(vite){vite.middlewares.use((req,res,next)=>{
  if(req.url.startsWith('/__rpc')||req.url==='/api/session-intake-ai'){
   let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{
    const request=JSON.parse(raw);res.setHeader('Content-Type','application/json');
    if(req.url.startsWith('/__rpc')){
     const q=new URL(req.url,'http://localhost').searchParams;
     let data=null;
     if(request.name==='get_my_session_journey')data=[];
     if(request.name==='get_my_session_intake')data={isOpen:!q.has('closed'),confirmedRecord:q.has('saved')?{intakeId:'old',studentRecord:record,sourceMode:'ai',confirmedAt:'2026-10-26T00:00:00Z',studentConfirmation:{},sourceConversation:[{actor:'system',purpose:'session starting point',text:'Original historical opening'}]}:saved,previousConfirmed:q.has('prior')?{studentRecord:{...record,next_action:{...record.next_action,action:q.has('emptyAction')?'':q.has('longAction')?'Discuss the approach with the team.\nImplement the agreed changes.\nRetest and update the report.':'Build a static chat page.'}}}:null};
     if(request.name==='save_my_session_intake_chat'){requests.push(request);saved={intakeId:'new',studentRecord:request.args.p_student_record,sourceMode:'ai',confirmedAt:'2026-10-26T00:00:00Z',studentConfirmation:request.args.p_student_confirmation,sourceConversation:request.args.p_source_conversation};}
     res.end(JSON.stringify({data,error:null}));return;
    }
    requests.push(request);
    if(request.mode==='chat'){res.end(JSON.stringify({model:'synthetic',result:{assistantMessage:ready?'You can now check and confirm your summary.':'What do you plan to work on before the next class?',readyForReview:ready,route:ready?'review':'continue',evidenceUpdates:[]}}));return;}
    res.end(JSON.stringify({model:'synthetic',result:{evidenceUpdates:[{field:'responsibility',state:'student_claim',value:'chat interface',sourceTurn:1,contextTurn:null,operation:'add'},{field:'claim',state:'student_claim',value:request.conversation[1].text,progressKind:'unknown',sourceTurn:1,contextTurn:null,operation:'add'}]},fieldDecisions:[]}));
   });return;
  }
  if(req.url.startsWith('/smoke')){res.setHeader('Content-Type','text/html');res.end('<div id="root"></div><script type="module" src="/src/intake-start-smoke.tsx"></script>');return;}next();
 });}}]});await server.listen();
 browser=await chromium.launch({executablePath:process.env.S10_CHROMIUM_EXECUTABLE,args:['--no-sandbox'],headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5184/')?r.continue():r.abort());
 const open=async q=>{saved=null;requests.length=0;await page.goto('http://127.0.0.1:5184/smoke'+q);await page.locator('.chat-messages').waitFor().catch(async e=>{console.error('Browser errors',errors);throw e;});await page.getByText('Loading Session Intake…',{exact:true}).waitFor({state:'hidden'});};
 await open('');
 const helper=page.getByRole('region',{name:'Help with your opening reply'});
 assert.match(await page.locator('.chat-message.assistant p').first().innerText(),/^Where is your project up to/);
 assert.match(await page.locator('.chat-round-guide').innerText(),/Let’s get started.*at most 2 follow-up/s);
 assert.equal(await helper.locator('details[open]').count(),0);
 await helper.getByText('Need a starting point?',{exact:true}).click();assert.match(await helper.innerText(),/next class.*optional/);
 await helper.getByText('See an example',{exact:true}).click();assert.match(await helper.innerText(),/haven’t built the application/);
 assert.equal(requests.length,0);
 await page.getByRole('button',{name:'I haven’t started yet',exact:true}).click();assert.equal(await page.locator('.chat-composer textarea').inputValue(),'I haven’t started my part yet.');
 await page.getByRole('button',{name:'I need help getting started',exact:true}).click();assert.match(await page.locator('.chat-composer textarea').inputValue(),/deciding my part/);assert.equal(requests.length,0);
 await page.screenshot({path:'/tmp/s11-start-desktop.png'});
 await page.setViewportSize({width:390,height:844});await open('');
 assert.equal(await page.locator('.chat-messages').evaluate(e=>e.scrollTop),0);
 assert.equal(await page.locator('.chat-intake-page').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
 assert.equal(await page.getByRole('button',{name:'Send',exact:true}).isVisible(),true);
 await page.screenshot({path:'/tmp/s11-start-mobile.png'});
 await helper.getByText('See an example',{exact:true}).click();
 const reply='We have wireframes. I own the chat interface. I plan to build a static chat page before the next class.';
 await page.locator('.chat-composer textarea').fill(reply);await page.getByRole('button',{name:'Send',exact:true}).click();
 const review=page.getByRole('region',{name:'Review your check-in'});await review.waitFor();
 assert.deepEqual(requests.map(r=>r.mode),['chat','record']);
 for(const r of requests){assert.equal(r.conversation.length,2);assert.equal(r.conversation[1].text,reply);assert.doesNotMatch(JSON.stringify(r.conversation),/sentence starters|sample response|An illustration|initial wireframes/);}
 assert.equal(await helper.count(),0);
 for(let i=0;i<5&&!await review.getByRole('heading',{name:'Ready to save',exact:true}).count();i++)await review.getByRole('button',{name:/^(Looks right · Continue|Skip for now)$/}).click();
 await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Save check-in',exact:true}).click();await page.getByRole('heading',{name:'Your progress, recorded',exact:true}).waitFor();
 const save=requests.find(r=>r.name==='save_my_session_intake_chat');assert.ok(save);assert.equal(save.args.p_source_conversation[1].text,reply);assert.doesNotMatch(JSON.stringify(save.args.p_source_conversation),/sentence starters|sample response|An illustration/);
 console.log('PASS S1 scaffolding and shortcuts; desktop/mobile; one-reply review/save without guidance entering source');
 ready=false;await open('');await page.locator('.chat-composer textarea').fill('I own the chat interface.');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('What do you plan to work on before the next class?',{exact:true}).waitFor();assert.equal(await helper.count(),0);assert.equal(requests.length,1);console.log('PASS optional clarification remains model-selected, no mandatory second question');
 for(const n of [1,2,3,4,5,6,7,8,9]){
  await open('?session='+n);
  assert.equal(await page.locator('.chat-message.assistant p').first().innerText(),intakeStart(n).question);
  assert.equal(await helper.count(),1);assert.equal(await helper.locator('details[open]').count(),0);
  assert.equal(await page.locator('.intake-last-checkin').count(),0);
  assert.equal(await page.locator('.chat-messages').evaluate(e=>e.scrollTop),0);
  assert.equal(await page.locator('.chat-intake-page').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  assert.equal(await page.getByRole('button',{name:'Send',exact:true}).isVisible(),true);
  const questionBox=await page.locator('.chat-message.assistant p').first().boundingBox(),composerBox=await page.locator('.chat-composer').boundingBox();
  assert.ok(questionBox.y+questionBox.height<=composerBox.y,'opening question remains above the composer for Session '+n);
 }
 await open('?session=7&prior&longAction');
 const prior=page.getByLabel('Your last confirmed check-in');
 assert.equal(await prior.getAttribute('open'),null);await prior.getByText('Your last check-in',{exact:true}).click();
 assert.match(await prior.innerText(),/chat interface/);assert.match(await prior.innerText(),/Retest and update the report/);
 assert.doesNotMatch(await page.locator('.chat-message.assistant p').first().innerText(),/Discuss the approach/);
 await page.getByRole('button',{name:'No progress',exact:true}).click();assert.equal(await page.locator('.chat-composer textarea').inputValue(),'I made no progress in this Session.');assert.equal(requests.length,0);
 await page.screenshot({path:'/tmp/s11-s7-prior-mobile.png'});
 ready=true;await page.locator('.chat-composer textarea').fill(reply);await page.getByRole('button',{name:'Send',exact:true}).click();await review.waitFor();
 for(const r of requests){assert.equal(r.conversation[0].text,intakeOpeningText(7,{responsibility:{current:'chat interface'},next_action:{action:'Discuss the approach with the team.\nImplement the agreed changes.\nRetest and update the report.'}}));assert.doesNotMatch(JSON.stringify(r.conversation),/We have not checked real AI|sentence starters/);}
 await open('?session=2&prior&emptyAction');await prior.getByText('Your last check-in',{exact:true}).click();assert.equal(await prior.getByText('Your planned next step',{exact:true}).count(),0);assert.match(await prior.innerText(),/chat interface/);
 await open('?session=2');assert.match(await page.locator('.chat-message.assistant p').first().innerText(),/agreed with your team/);await page.screenshot({path:'/tmp/s11-s2-mobile.png'});
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'/tmp/s11-s2-desktop.png'});
 await open('?session=1&saved');await page.getByRole('heading',{name:'Your progress, recorded',exact:true}).waitFor();assert.equal(await helper.count(),0);assert.equal(await page.locator('.chat-composer').count(),0);
 await open('?closed');assert.match(await page.locator('.chat-message').innerText(),/is closed/);assert.equal(await helper.count(),0);assert.equal(await page.locator('.chat-composer').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS all nine openings on mobile; prior multi-action context retained separately from displayed question; no scaffolding in source; saved/closed first Session read-only');
}finally{await browser?.close();await server?.close();}
