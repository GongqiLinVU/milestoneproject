import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import React,{act} from 'react';
import {create} from 'react-test-renderer';
buildSync({entryPoints:['src/TeacherDisplayName.tsx'],bundle:true,platform:'node',format:'esm',outfile:'.test-build/TeacherDisplayName.mjs',external:['react','react/jsx-runtime']});
const {TeacherDisplayName}=await import('../../.test-build/TeacherDisplayName.mjs');
global.IS_REACT_ACT_ENVIRONMENT=true;
after(()=>delete global.IS_REACT_ACT_ENVIRONMENT);
test('display name editor loads without writing, saves only own name and preserves input on failure',async()=>{
 const calls=[];let fail=true,tree;
 const client={rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='get_my_teacher_display_name')return {data:'Platform administrator'};
  return fail?{error:{message:'Please retry'}}:{data:'Joseph Lin'};
 }};
 await act(async()=>{tree=create(React.createElement(TeacherDisplayName,{client}));});
 assert.deepEqual(calls.map(c=>c.name),['get_my_teacher_display_name']);
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'Joseph Lin'}}));
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(tree.root.findByType('input').props.value,'Joseph Lin');
 assert.match(JSON.stringify(tree.toJSON()),/Please retry/);
 fail=false;
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.deepEqual(calls.at(-1),{name:'save_my_teacher_display_name',args:{p_name:'Joseph Lin'}});
 assert.equal(tree.root.findByType('button').props.disabled,true);
 assert.match(JSON.stringify(tree.toJSON()),/Teacher name saved/);
 await act(async()=>tree.unmount());
});
