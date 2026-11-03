// Mocked DOM workflow rehearsal; compile the component with esbuild first.
// Supply STAFF_DOM_MODULE when jsdom is installed outside this repository.
const {test}=require('node:test');const assert=require('node:assert/strict');
const {JSDOM}=require(process.env.STAFF_DOM_MODULE||'jsdom');
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost'});
Object.assign(global,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
dom.window.HTMLElement.prototype.scrollIntoView=function(){};dom.window.confirm=()=>true;
const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');
const {TeacherAdministration}=require('../../.test-build/TeacherAdministration.cjs');
const classes=[{id:'active',academic_year:2026,block_code:'2B4',class_code:'C1',status:'active'},{id:'planned',academic_year:2026,block_code:'2B4',class_code:'C2',status:'planned'},{id:'archive',academic_year:2026,block_code:'2B1',class_code:'C1',status:'archived'}];
let teachers=[{userId:'existing',name:'Existing teacher',email:'existing@example.invalid',active:true,classIds:['archive','active'],mustChangePassword:false}],createdBody,changes=0;
const client={auth:{getSession:async()=>({data:{session:{access_token:'synthetic-test-token'}}})},rpc:async(name,args)=>{
 if(name==='get_teacher_administration')return{data:structuredClone(teachers),error:null};
 if(name==='set_teacher_classes'){const t=teachers.find(t=>t.userId===args.p_user_id);t.classIds=[...args.p_class_ids];t.active=args.p_active;return{error:null};}
 if(name==='set_teacher_class_membership'){const t=teachers.find(t=>t.userId===args.p_user_id);t.classIds=args.p_assigned?[...new Set([...t.classIds,args.p_class_id])]:t.classIds.filter(id=>id!==args.p_class_id);return{error:null};}
 throw Error('Unexpected RPC '+name);
},from:()=>({insert:async row=>{classes.push({...row,id:'created'});return{error:null};},update:row=>({eq:async(_,id)=>{Object.assign(classes.find(c=>c.id===id),row);return{error:null};}})})};
global.fetch=async(url,options)=>{assert.equal(url,'/api/teacher-accounts');createdBody=JSON.parse(options.body);assert.equal(createdBody.action,'create');teachers.push({userId:'new',name:createdBody.name,email:createdBody.email,active:true,classIds:[],mustChangePassword:true});return{ok:true,json:async()=>({email:createdBody.email,initialPassword:'Synthetic-fixture-password'})};};
function Harness(){const [rows,setRows]=React.useState(classes);return React.createElement(TeacherAdministration,{client,classes:rows,onChanged:()=>{changes++;setRows(structuredClone(classes));}});}
const click=async element=>{assert.ok(element,'Expected control');await act(async()=>{element.click();});};
const panel=name=>document.querySelector('#staff-panel-'+name);
const tab=name=>document.querySelector('#staff-tab-'+name);
const button=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
async function input(element,value){await act(async()=>{const proto=element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
test('three-tab workflow creates unassigned teachers, preserves historical memberships and restores archived classes',async()=>{
 teachers.push({userId:'admin',name:'Administrator teacher',email:'admin@example.invalid',active:true,isSuperadmin:true,classIds:[],mustChangePassword:false});
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Harness)));
 assert.equal(tab('assignments').getAttribute('aria-selected'),'true');assert.equal(panel('teachers').hidden,true);assert.equal(panel('assignments').querySelector('.staff-history').open,false);assert.equal(panel('assignments').querySelectorAll(':scope > .staff-assignment-grid .staff-assignment-card').length,2);
 await click(tab('teachers'));const form=panel('teachers').querySelector('form');assert.equal(form.querySelectorAll('[type=checkbox]').length,0);await input(form.querySelector('input:not([type])'),'New teacher');await input(form.querySelector('[type=email]'),'new@example.invalid');await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.deepEqual(createdBody.classIds,[]);assert.equal(createdBody.name,'New teacher');assert.match(panel('teachers').textContent,/No classes assigned/);
 const newRow=[...panel('teachers').querySelectorAll('tbody tr')].find(r=>r.textContent.includes('new@example.invalid'));await click(button(newRow,'Assign classes'));assert.equal(tab('assignments').getAttribute('aria-selected'),'true');const activeCard=()=>[...panel('assignments').querySelectorAll('.staff-assignment-card')].find(c=>c.querySelector('header').textContent.includes('2B4 · C1'));
 await click(button(activeCard(),'Assign New teacher'));assert.deepEqual(teachers.find(t=>t.userId==='new').classIds,['active']);
 await input(panel('assignments').querySelector('select'),'existing');const plannedCard=[...panel('assignments').querySelectorAll('.staff-assignment-card')].find(c=>c.querySelector('header').textContent.includes('2B4 · C2'));await click(button(plannedCard,'Assign Existing teacher'));assert.deepEqual(new Set(teachers[0].classIds),new Set(['archive','active','planned']));
 await click(activeCard().querySelector('[aria-label^="Remove Existing teacher"]'));assert.deepEqual(new Set(teachers[0].classIds),new Set(['archive','planned']));
 await click(activeCard().querySelector('[aria-label^="Remove New teacher"]'));assert.deepEqual(teachers.find(t=>t.userId==='new').classIds,[]);assert.equal(teachers.find(t=>t.userId==='new').active,true);
 await click(tab('classes'));const classForm=panel('classes').querySelector('form');await input(classForm.querySelector('input[maxlength="20"]'),'C9');await act(async()=>classForm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(classes.find(c=>c.id==='created').class_code,'C9');assert.equal(classes.find(c=>c.id==='created').status,'planned');const archive=panel('classes').querySelector('.staff-history');assert.equal(archive.open,false);await click(archive.querySelector('summary'));await input(archive.querySelector('select'),'active');assert.equal(classes.find(c=>c.id==='archive').status,'active');assert.deepEqual(new Set(teachers[0].classIds),new Set(['archive','planned']));assert.ok(changes>=4);
 await click(tab('teachers'));const existingRow=[...panel('teachers').querySelectorAll('tbody tr')].find(r=>r.textContent.includes('existing@example.invalid'));await click(button(existingRow,'Disable'));assert.equal(teachers[0].active,false);assert.deepEqual(new Set(teachers[0].classIds),new Set(['archive','planned']));
 const adminRow=[...panel('teachers').querySelectorAll('tbody tr')].find(r=>r.textContent.includes('admin@example.invalid'));assert.deepEqual([...adminRow.querySelectorAll('button')].map(b=>b.textContent),['Assign classes']);await click(button(adminRow,'Assign classes'));await click(button(activeCard(),'Assign Administrator teacher'));assert.deepEqual(teachers.find(t=>t.userId==='admin').classIds,['active']);
 await act(async()=>root.unmount());
});
