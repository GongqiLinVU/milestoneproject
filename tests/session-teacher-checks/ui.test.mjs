import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import React,{act} from 'react';
import {create} from 'react-test-renderer';
buildSync({entryPoints:['src/SessionTeacherCheck.tsx'],bundle:true,platform:'node',format:'esm',outfile:'.test-build/SessionTeacherCheck.mjs',external:['react','react/jsx-runtime'],loader:{'.css':'empty'}});
const {OptionalTeacherCheck,StudentSessionCheckReceipt}=await import('../../.test-build/SessionTeacherCheck.mjs');
global.IS_REACT_ACT_ENVIRONMENT=true;
const oldWindow=global.window, oldDocument=global.document;
global.window={setInterval:()=>1,clearInterval(){}};
global.document={addEventListener(){},removeEventListener(){}};
after(()=>{global.window=oldWindow;global.document=oldDocument;delete global.IS_REACT_ACT_ENVIRONMENT;});
const empty={version:0,summaryRevision:1,correctionOpen:false,check:null,history:[]};
function harness(options={}) {
 const calls=[]; let state=structuredClone(options.context||empty), fail=options.fail;
 const client={rpc:async(name,args)=>{calls.push({name,args}); if(name==='get_session_teacher_check')return {data:state};
 if(fail)return {error:{message:'Changed in another window'}};
 state={...state,version:state.version+1,check:{version:state.version+1,summaryRevision:1,current:true,level:args.p_level,comment:args.p_comment,checkedAt:'2026-11-18T00:00:00Z',teacherName:'Teacher'}};
 return {data:state};}};
 return {calls,client};
}
const button=(tree,label)=>tree.root.findAllByType('button').find(b=>b.children.join('')===label);
test('opening never writes; a blank explicit check succeeds and reports saved',async()=>{
 const h=harness();let tree,saved=0;
 await act(async()=>{tree=create(React.createElement(OptionalTeacherCheck,{client:h.client,intakeId:'i',onSaved:()=>saved++}));});
 assert.deepEqual(h.calls.map(c=>c.name),['get_session_teacher_check']);
 await act(async()=>{button(tree,'Mark as checked').props.onClick();});
 assert.equal(saved,1);const write=h.calls[1];assert.equal(write.args.p_level,null);assert.equal(write.args.p_comment,'');
 assert.equal(button(tree,'Checked').props.disabled,true);
 await act(async()=>tree.unmount());
});
test('failed save preserves inputs and dirty state; reload is disabled until discarded',async()=>{
 const h=harness({fail:true});let tree,dirty=false;
 await act(async()=>{tree=create(React.createElement(OptionalTeacherCheck,{client:h.client,intakeId:'i',onDirty:v=>dirty=v}));});
 await act(async()=>tree.root.findByType('textarea').props.onChange({target:{value:'Need tests'}}));
 assert.equal(dirty,true);assert.equal(button(tree,'Reload check').props.disabled,true);
 await act(async()=>button(tree,'Mark as checked').props.onClick());
 assert.equal(tree.root.findByType('textarea').props.value,'Need tests');assert.equal(dirty,true);
 assert.match(JSON.stringify(tree.toJSON()),/another window/);
 await act(async()=>button(tree,'Discard changes').props.onClick());assert.equal(dirty,false);
 await act(async()=>tree.unmount());
});
test('old revision feedback is retained but new check fields start empty',async()=>{
 const h=harness({context:{...empty,version:1,summaryRevision:2,check:{version:1,summaryRevision:1,current:false,level:'good',comment:'Old comment',checkedAt:'2026-11-18T00:00:00Z',teacherName:'T'}}});let tree;
 await act(async()=>{tree=create(React.createElement(OptionalTeacherCheck,{client:h.client,intakeId:'i'}));});
 assert.equal(tree.root.findByType('textarea').props.value,'');assert.match(JSON.stringify(tree.toJSON()),/Updated since check/);
 await act(async()=>tree.unmount());
});
test('student feedback receipt is read only and optional check produces no student task',async()=>{
 const h=harness();let tree;
 await act(async()=>{tree=create(React.createElement(StudentSessionCheckReceipt,{client:h.client,intakeId:'i'}));});
 assert.equal(tree.toJSON(),null);assert.equal(h.calls.length,1);
 await act(async()=>tree.unmount());
 const checked=harness({context:{...empty,check:{version:1,summaryRevision:1,current:true,level:'good',comment:'Clear tests',checkedAt:'2026-11-18T00:00:00Z',teacherName:'Teacher'}}});
 await act(async()=>{tree=create(React.createElement(StudentSessionCheckReceipt,{client:checked.client,intakeId:'i'}));});
 assert.match(JSON.stringify(tree.toJSON()),/Good progress/);assert.equal(tree.root.findAllByType('button').length,0);
 assert.ok(checked.calls.every(c=>c.name==='get_session_teacher_check'));
 await act(async()=>tree.unmount());
});
test('saving disables fields and prevents reload; correction windows cannot be checked',async()=>{
 let resolveWrite,tree;const h=harness();const read=h.client.rpc;
 h.client.rpc=(name,args)=>name==='mark_session_teacher_check'?new Promise(resolve=>resolveWrite=()=>resolve({error:{message:'Save interrupted'}})):read(name,args);
 await act(async()=>{tree=create(React.createElement(OptionalTeacherCheck,{client:h.client,intakeId:'i'}));});
 await act(async()=>button(tree,'Mark as checked').props.onClick());
 assert.equal(tree.root.findByType('fieldset').props.disabled,true);assert.equal(button(tree,'Reload check').props.disabled,true);
 await act(async()=>resolveWrite());await act(async()=>tree.unmount());
 const correction=harness({context:{...empty,correctionOpen:true}});
 await act(async()=>{tree=create(React.createElement(OptionalTeacherCheck,{client:correction.client,intakeId:'i'}));});
 assert.equal(button(tree,'Mark as checked').props.disabled,true);
 assert.equal(tree.root.findByType('fieldset').props.disabled,true);
 await act(async()=>tree.unmount());
});
