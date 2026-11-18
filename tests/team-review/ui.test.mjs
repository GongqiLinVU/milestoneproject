import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import React,{act} from 'react';
import {create} from 'react-test-renderer';
buildSync({entryPoints:['src/TeamReview.tsx','src/CoreReviewEditor.tsx','src/ReviewHub.tsx'],bundle:true,platform:'node',format:'esm',outdir:'.test-build/team-review-ui',external:['react','react/jsx-runtime'],loader:{'.css':'empty'}});
const {TeamReviewDialog}=await import('../../.test-build/team-review-ui/TeamReview.js');
const {PublishedCoreFeedback}=await import('../../.test-build/team-review-ui/CoreReviewEditor.js');
const {ReviewHub}=await import('../../.test-build/team-review-ui/ReviewHub.js');
const previous={window:global.window,document:global.document,fetch:global.fetch};
global.IS_REACT_ACT_ENVIRONMENT=true;
global.window={confirm:()=>false,addEventListener(){},removeEventListener(){}};
global.document={body:{style:{overflow:'auto'}},documentElement:{style:{overflow:''}}};
global.fetch=async()=>{throw Error('No paid calls in test');};
after(()=>{Object.assign(global,previous);delete global.IS_REACT_ACT_ENVIRONMENT;});
const empty=()=>({confirmedProgress:[],mainIssues:[],nextSteps:[]});
const node={id:'r2',label:'Midpoint',fromSession:1,toSession:3,suggestedSession:4,includePreviousBlock:false};
const initial=()=>({id:'meeting',version:0,node,teamNumber:2,members:[{studentId:'a',studentName:'Amal'},{studentId:'b',studentName:'Krish'}],participants:[],observation:'',meetingDate:'2026-11-19',feedback:{shared:empty(),members:[],unresolved:[]},feedbackObservation:'',feedbackParticipants:[],feedbackEdited:false,sources:{a:{missingSessions:[2],updates:[]},b:{missingSessions:[],updates:[]}},targets:[{studentId:'a',version:0,hasWork:false,changed:false},{studentId:'b',version:0,hasWork:false,changed:false}],confirmed:{},jobs:{guide:{status:'ready',current:true,result:{questions:['One?','Two?','Three?']}}}});
function harness(options={}){
 let doc={...initial(),...options.doc};const calls=[];
 return {calls,client:{rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='open_teacher_team_meeting'||name==='get_teacher_team_meeting')return {data:structuredClone(doc)};
  if(name==='list_teacher_team_meetings')return {data:[{...doc,nodeKey:'r2'}]};
  if(name==='save_teacher_team_meeting'){
   if(options.fail)return {error:{message:'Meeting changed in another window'}};
   doc={...doc,...args.p_draft,version:doc.version+1};if(options.concurrent)doc.targets=doc.targets.map(t=>({...t,version:7}));return {data:structuredClone(doc)};
  }
  if(name==='publish_teacher_team_members'){doc={...doc,version:doc.version+1,confirmed:{a:{reviewVersion:1}}};return {data:structuredClone(doc)};}
  throw Error('Unexpected RPC '+name);
 }}};
}
const button=(tree,label)=>tree.root.findAllByType('button').find(b=>b.children.join('')===label);
const labelInput=(tree,text)=>tree.root.findAllByType('label').find(l=>l.children.some(c=>typeof c==='string'&&c.includes(text))).findByType('input');
async function mount(h){let tree;await act(async()=>{tree=create(React.createElement(TeamReviewDialog,{client:h.client,blockId:'block',teamNumber:2,nodeKey:'r2',onClose(){},onSaved(){},onDirty(){}}),{createNodeMock:e=>e.type==='dialog'?{showModal(){}}:null});});return tree;}
test('opens a meeting without assuming attendance, model calls or individual publication; modal owns scrolling',async()=>{
 const h=harness();const tree=await mount(h);
 assert.ok(h.calls.every(c=>c.name.startsWith('get_')||c.name.startsWith('open_')||c.name.startsWith('list_')));
 assert.equal(labelInput(tree,'Amal').props.checked,false);assert.equal(labelInput(tree,'Krish').props.checked,false);
 assert.equal(button(tree,'Confirm selected members (0)').props.disabled,true);
 assert.equal(document.body.style.overflow,'hidden');
 await act(async()=>tree.unmount());assert.equal(document.body.style.overflow,'auto');
});
test('one participant can be confirmed with shared context; absent teammate is never included, target versions do not silently advance during autosave',async()=>{
 const h=harness({concurrent:true});const tree=await mount(h);
 await act(async()=>labelInput(tree,'Amal').props.onChange({target:{checked:true}}));
 // Personal feedback editor: three shared textareas precede the participating member editor.
 const personal=tree.root.findAllByType('textarea')[4];
 await act(async()=>personal.props.onChange({target:{value:'Explained search implementation.'}}));
 await act(async()=>button(tree,'Save draft').props.onClick());
 const confirm=labelInput(tree,"Confirm this student's");assert.equal(confirm.props.disabled,false);
 await act(async()=>confirm.props.onChange({target:{checked:true}}));
 await act(async()=>button(tree,'Confirm selected members (1)').props.onClick());
 const write=h.calls.find(c=>c.name==='publish_teacher_team_members');assert.deepEqual(write.args.p_targets,[{studentId:'a',version:0,replace:false}]);
 assert.doesNotMatch(JSON.stringify(write.args),/"studentId":"b"/);
 await act(async()=>tree.unmount());
});
test('failed saves retain the meeting observation for explicit retry and never publish',async()=>{
 const h=harness({fail:true});const tree=await mount(h);
 await act(async()=>tree.root.findAllByType('textarea')[0].props.onChange({target:{value:'Teacher saw the demo.'}}));
 await act(async()=>button(tree,'Save draft').props.onClick());
 assert.equal(tree.root.findAllByType('textarea')[0].props.value,'Teacher saw the demo.');assert.match(JSON.stringify(tree.toJSON()),/another window/);
 assert.ok(!h.calls.some(c=>c.name==='publish_teacher_team_members'));
 await act(async()=>tree.unmount());
});
test('existing individual work requires explicit replacement before confirmation selection',async()=>{
 const d=initial();d.participants=['a'];d.feedbackParticipants=['a'];d.feedback.members=[{studentId:'a',...empty(),confirmedProgress:['Showed code.']}];d.targets[0].hasWork=true;d.targets[0].version=3;
 const tree=await mount(harness({doc:d}));assert.equal(labelInput(tree,"Confirm this student's").props.disabled,true);
 await act(async()=>labelInput(tree,'Replace the existing').props.onChange({target:{checked:true}}));
 assert.equal(labelInput(tree,"Confirm this student's").props.disabled,false);
 await act(async()=>tree.unmount());
});
test('published student view displays common and own feedback without other members or raw meeting data',async()=>{
 let tree;await act(async()=>{tree=create(React.createElement(PublishedCoreFeedback,{feedback:{teamFeedback:{...empty(),mainIssues:['Team integration needs testing.']},coreReview:{...empty(),confirmedProgress:['You explained search.']},observation:'PRIVATE',members:[{studentId:'b',mainIssues:['CLASSMATE_PRIVATE']}]}}));});
 const text=JSON.stringify(tree.toJSON());assert.match(text,/Shared team feedback/);assert.match(text,/You explained search/);assert.doesNotMatch(text,/PRIVATE/);
 await act(async()=>tree.unmount());
});
test('hub Team entry shows names and member completion counts; meeting records are searchable',async()=>{
 const hub={config:{sessionAI:true,nodes:[node]},version:0,students:[{studentId:'a',studentName:'Amal',teamNumber:2},{studentId:'b',studentName:'Krish',teamNumber:2}],reviews:[],legacy:[],teamMeetings:[{...initial(),nodeKey:'r2',observation:'SEARCHABLE_REVIEW'}]};let tree;
 await act(async()=>{tree=create(React.createElement(ReviewHub,{client:{rpc:async()=>({data:hub})},blockId:'block',blocks:[],onBlockChange(){},onUnsaved(){}}));});
 await act(async()=>button(tree,'Team').props.onClick());assert.match(JSON.stringify(tree.toJSON()),/Amal · Krish/);assert.ok(button(tree,'Open team meeting'));
 await act(async()=>button(tree,'Review records').props.onClick());assert.ok(button(tree,'View meeting'));
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'no-match'}}));assert.equal(button(tree,'View meeting'),undefined);
 await act(async()=>tree.unmount());
});
test('background save keeps observation editable and does not overwrite typing that arrives while saving',async()=>{
 const h=harness();const original=h.client.rpc;let complete,tree;
 h.client.rpc=(name,args)=>name==='save_teacher_team_meeting'?new Promise(resolve=>complete=async()=>resolve(await original(name,args))):original(name,args);
 tree=await mount(h);
 await act(async()=>tree.root.findAllByType('textarea')[0].props.onChange({target:{value:'First observation'}}));
 await act(async()=>button(tree,'Save draft').props.onClick());
 assert.equal(tree.root.findAllByType('textarea')[0].props.disabled,false);
 await act(async()=>tree.root.findAllByType('textarea')[0].props.onChange({target:{value:'First observation, with more detail'}}));
 await act(async()=>complete());
 assert.equal(tree.root.findAllByType('textarea')[0].props.value,'First observation, with more detail');
 assert.equal(button(tree,'Save draft').props.disabled,false);
 await act(async()=>tree.unmount());
});
test('changing an observation after selecting a student clears the earlier confirmation selection',async()=>{
 const d=initial();d.participants=['a'];d.feedbackParticipants=['a'];d.feedback.members=[{studentId:'a',...empty(),confirmedProgress:['Showed code.']}];
 const tree=await mount(harness({doc:d}));
 await act(async()=>labelInput(tree,"Confirm this student's").props.onChange({target:{checked:true}}));assert.ok(button(tree,'Confirm selected members (1)'));
 await act(async()=>tree.root.findAllByType('textarea')[0].props.onChange({target:{value:'A new observation'}}));
 assert.equal(button(tree,'Confirm selected members (0)').props.disabled,true);
 await act(async()=>tree.unmount());
});
