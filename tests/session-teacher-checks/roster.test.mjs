import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import React,{act} from 'react';
import {create} from 'react-test-renderer';
buildSync({entryPoints:['src/IntakeTeacherReview.tsx'],bundle:true,platform:'node',format:'esm',outfile:'.test-build/SessionCheckRoster.mjs',external:['react','react/jsx-runtime'],loader:{'.css':'empty'}});
const {TeacherIntakeReviews}=await import('../../.test-build/SessionCheckRoster.mjs');
const oldWindow=global.window,oldDocument=global.document;
global.IS_REACT_ACT_ENVIRONMENT=true;
global.window={setInterval:()=>1,clearInterval(){},addEventListener(){},removeEventListener(){},confirm:()=>true};
global.document={body:{style:{}},documentElement:{style:{}},addEventListener(){},removeEventListener(){}};
after(()=>{global.window=oldWindow;global.document=oldDocument;delete global.IS_REACT_ACT_ENVIRONMENT;});
test('opening saved AI review shows AI reviewed; checking refreshes roster and Checked filter without completing formal review',async()=>{
 let checked=false,writes=0;let tree;
 const client={rpc:async(name)=>{
  if(name==='get_teacher_session_progress_states')return {data:[{intakeId:'i',summaryRevision:1,checkRevision:checked?1:null,checkCurrent:checked,checkLevel:null,aiStatus:'ready',correctionOpen:false}]};
  if(name==='get_session_ai_check')return {data:{status:'ready',result:{summary:'Reported update',questions:[],attentionPoints:[]}}};
  if(name==='get_core_review_workspace')return {data:{review:null}};
  if(name==='mark_session_teacher_check'){checked=true;writes++;}
  if(['get_session_teacher_check','mark_session_teacher_check'].includes(name))return {data:{version:checked?1:0,summaryRevision:1,correctionOpen:false,check:checked?{version:1,summaryRevision:1,current:true,comment:'',level:null,checkedAt:'2026-11-18T00:00:00Z',teacherName:'Teacher'}:null,history:[]}};
  throw Error('Unexpected RPC '+name);
 }};
 await act(async()=>{tree=create(React.createElement(TeacherIntakeReviews,{client,sessionId:'s7',title:'S7',rows:[{studentId:'student',studentName:'Amal',teamName:'Team 2',intakeId:'i',submitted:true,studentRecord:{}}],renderSource:()=>null,onClose(){}}),{createNodeMock:e=>e.type==='dialog'?{showModal(){}}:null});});
 const roster=()=>tree.root.findAllByType('span').filter(s=>s.props.className==='review-roster-status');
 assert.equal(roster()[0].children[0],'AI reviewed');
 await act(async()=>tree.root.findAllByType('button').find(b=>b.props['aria-pressed']===false).props.onClick());
 assert.equal(writes,0);
 await act(async()=>tree.root.findAllByType('button').find(b=>b.children.join('')==='Mark as checked').props.onClick());
 assert.equal(writes,1);assert.equal(roster()[0].children[0],'Checked');
 await act(async()=>tree.root.findAllByType('select')[0].props.onChange({target:{value:'checked'}}));
 assert.equal(roster().length,1);
 await act(async()=>tree.unmount());
});
test('AI completion refreshes roster automatically without marking a teacher check',async()=>{
 const originalInterval=global.setInterval,originalClear=global.clearInterval;
 let poll,ready=false,tree,writes=0;
 global.setInterval=fn=>{poll=fn;return 1;}; global.clearInterval=()=>{};
 const client={rpc:async(name)=>{
  if(name==='get_teacher_session_progress_states')return {data:[{intakeId:'i',summaryRevision:1,checkRevision:null,checkCurrent:false,checkLevel:null,aiStatus:ready?'ready':'pending',correctionOpen:false}]};
  if(name==='get_session_ai_check')return {data:{status:ready?'ready':'pending',result:ready?{summary:'AI update',questions:[]}:null}};
  if(name==='get_session_teacher_check')return {data:{version:0,summaryRevision:1,correctionOpen:false,check:null,history:[]}};
  if(name==='get_core_review_workspace')return {data:{review:null}};
  writes++;throw Error('Unexpected write '+name);
 }};
 try{
  await act(async()=>{tree=create(React.createElement(TeacherIntakeReviews,{client,sessionId:'s7',title:'S7',rows:[{studentId:'student',studentName:'Amal',intakeId:'i',submitted:true}],renderSource:()=>null,onClose(){}}),{createNodeMock:e=>e.type==='dialog'?{showModal(){}}:null});});
  const status=()=>tree.root.findAllByType('span').find(s=>s.props.className==='review-roster-status').children[0];
  assert.equal(status(),'AI reviewing');
  await act(async()=>tree.root.findAllByType('button').find(b=>b.props['aria-pressed']===false).props.onClick());
  ready=true;await act(async()=>{poll();});
  assert.equal(status(),'AI reviewed');assert.equal(writes,0);
 }finally{
  if(tree)await act(async()=>tree.unmount());global.setInterval=originalInterval;global.clearInterval=originalClear;
 }
});
