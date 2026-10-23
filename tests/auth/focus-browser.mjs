// Offline transport: exercise real React auth handling and the real Add project
// dialog without production credentials, account changes or database writes.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.S10_PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=`
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import {useStaffSession} from '/src/useStaffSession.ts';import {StudentAccess} from '/src/StudentAccess.tsx';import {ProjectManager} from '/src/TeamAllocation.tsx';
const listeners=new Set();const session=id=>id?{user:{id,email:id+'@example.invalid'},access_token:'synthetic-'+Math.random()}:null;
window.calls={};window.mode='ok';window.pending=[];window.current=session('a');window.mounts=0;
window.emit=(event,id='a')=>{window.current=session(id);for(const callback of listeners)callback(event,window.current);};
window.client={auth:{getSession:async()=>({data:{session:window.current}}),onAuthStateChange:cb=>{listeners.add(cb);return{data:{subscription:{unsubscribe:()=>listeners.delete(cb)}}};},signOut:async()=>window.emit('SIGNED_OUT',null)},rpc:async name=>{
 window.calls[name]=(window.calls[name]||0)+1;
 if(name==='get_staff_context'){if(window.mode==='hold')return new Promise(resolve=>window.pending.push(resolve));if(window.mode==='error')return{data:null,error:{message:'offline'}};return{data:{isTeacher:window.mode!=='revoked',isSuperadmin:false,mustChangePassword:false},error:null};}
 if(name==='get_my_student_context'){const id=window.current?.user.id;const result={data:{status:'activated',studentId:id,studentName:id,blockId:'class-'+id,teamName:'Team 1',projectName:'Booking'},error:null};if(window.mode==='hold')return new Promise(resolve=>window.pending.push(()=>resolve(result)));return result;}
 return {data:null,error:null};},from:table=>{const b=new Proxy({}, {get:(_,key)=>key==='then'?(yes,no)=>Promise.resolve({data:table==='teaching_blocks'?[{id:'class',academic_year:2026,block_code:'2B4',class_code:'C1',status:'active'}]:[],error:null}).then(yes,no):()=>b});return b;}};
function Draft(){const [value,setValue]=useState('');useEffect(()=>{window.mounts++;},[]);return <label>Student draft<input value={value} onChange={e=>setValue(e.target.value)}/></label>;}
function Teacher(){const {sessionUser,authChecking}=useStaffSession(window.client);if(authChecking)return <p>Checking access</p>;if(!sessionUser)return <p>Signed out</p>;if(!sessionUser.isTeacher)return <p>Access denied</p>;return <><p>Teacher workspace</p><ProjectManager/></>;}
function App(){return location.search.includes('student')?<StudentAccess><Draft/></StudentAccess>:<Teacher/>;}createRoot(document.getElementById('root')).render(<App/>);
`;
let server,browser;
try{
 server=await createServer({root,configFile:false,esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:5182},plugins:[{name:'focus-regression',resolveId(id){if(id==='/__focus.tsx')return root+'src/focus-regression.tsx';},async load(id){if(id===root+'src/focus-regression.tsx')return source;if(['StudentAccess.tsx','TeamAllocation.tsx'].some(file=>id===root+'src/'+file)){const code=await fs.readFile(id,'utf8'),a=code.indexOf('const supabase = createClient('),b=code.indexOf('\n);',a)+4;assert.ok(a>=0&&b>a);return code.slice(0,a)+'const supabase:any=new Proxy({}, {get:(_,key)=>(window as any).client[key]});'+code.slice(b);}},configureServer(vite){vite.middlewares.use((req,res,next)=>{if(!req.url.startsWith('/focus'))return next();res.setHeader('Content-Type','text/html');res.end('<div id="root"></div><script type="module" src="/__focus.tsx"></script>');});}}]});await server.listen();
 browser=await chromium.launch({executablePath:process.env.S10_CHROMIUM_EXECUTABLE,args:['--no-sandbox'],headless:true});const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:5182/')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:5182/focus');await page.getByText('Teacher workspace',{exact:true}).waitFor();await page.getByRole('button',{name:'Add project',exact:true}).click();const title=page.getByRole('textbox',{name:'Title',exact:true});await title.fill('Unsaved booking project');
 // Re-focus and token refresh must preserve the exact input DOM node and text.
 await title.evaluate(el=>{window.originalInput=el;});
 await page.evaluate(()=>{window.mode='hold';window.emit('SIGNED_IN');});await page.waitForFunction(()=>window.pending.length===1);assert.equal(await page.getByText('Checking access',{exact:true}).count(),0);assert.equal(await title.inputValue(),'Unsaved booking project');
 await page.evaluate(()=>{window.pending.shift()({data:{isTeacher:true,isSuperadmin:false,mustChangePassword:false},error:null});window.mode='ok';});await page.evaluate(()=>window.emit('TOKEN_REFRESHED'));await page.waitForFunction(()=>window.calls.get_staff_context>=3);assert.ok(await title.evaluate(el=>el===window.originalInput));
 await page.evaluate(()=>{window.mode='error';window.emit('SIGNED_IN');});await page.waitForFunction(()=>window.calls.get_staff_context>=4);assert.equal(await title.inputValue(),'Unsaved booking project');
 // A stale successful check cannot undo a later sign-out.
 await page.evaluate(()=>{window.mode='hold';window.emit('SIGNED_IN');});await page.waitForFunction(()=>window.pending.length===1);await page.evaluate(()=>window.emit('SIGNED_OUT',null));await page.getByText('Signed out',{exact:true}).waitFor();await page.evaluate(()=>window.pending.shift()({data:{isTeacher:true},error:null}));assert.equal(await page.getByRole('dialog').count(),0);
 await page.evaluate(()=>{window.mode='ok';window.emit('SIGNED_IN','b');});await page.getByText('Teacher workspace',{exact:true}).waitFor();await page.getByRole('button',{name:'Add project',exact:true}).click();assert.equal(await title.inputValue(),'');await page.evaluate(()=>{window.mode='revoked';window.emit('TOKEN_REFRESHED','b');});await page.getByText('Access denied',{exact:true}).waitFor();
 await page.goto('http://127.0.0.1:5182/focus?student');const draft=page.getByRole('textbox',{name:'Student draft',exact:true});await draft.fill('My unsaved progress');await draft.evaluate(el=>{window.originalInput=el;});
 await page.evaluate(()=>{window.emit('SIGNED_IN');window.emit('TOKEN_REFRESHED');document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.calls.get_my_open_studio_session>=2);assert.equal(await draft.inputValue(),'My unsaved progress');assert.ok(await draft.evaluate(el=>el===window.originalInput));assert.equal(await page.evaluate(()=>window.calls.get_my_student_context),1);assert.equal(await page.evaluate(()=>window.mounts),1);
 // Identity changes hide the previous context immediately; stale RPCs are ignored.
 await page.evaluate(()=>{window.mode='hold';window.emit('SIGNED_IN','b');});await page.waitForFunction(()=>window.pending.length===1);assert.equal(await page.getByRole('textbox',{name:'Student draft',exact:true}).count(),0);await page.evaluate(()=>window.emit('SIGNED_OUT',null));await page.getByRole('heading',{name:'Student login',exact:true}).waitFor();await page.evaluate(()=>window.pending.shift()());assert.equal(await page.getByRole('textbox',{name:'Student draft',exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS focus/token refresh preserves teacher Add project DOM and student draft; failures, stale responses, account switching, sign-out and revocation handled');
}finally{await browser?.close();await server?.close();}
