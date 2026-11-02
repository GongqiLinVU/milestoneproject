import {test} from 'node:test';import assert from 'node:assert/strict';
import {debugAvailability,collectIntakeDiagnostics} from '../../.test-build/intakeDiagnostics.js';
test('debug availability distinguishes missing, compacted, truncated and legacy extent',()=>{
 assert.equal(debugAvailability({}).status,'no_saved_debug');
 assert.equal(debugAvailability({debug_events:[{request:{capturedEventCount:3}}]}).status,'saved_partial');
 assert.equal(debugAvailability({debug_events:[{request:{capturedEventCount:1},response:{traceDetailOmitted:true}}]}).status,'saved_partial');
 assert.equal(debugAvailability({debug_events:[{request:{capturedEventCount:1}}]}).status,'saved_within_capture_limit');
 assert.equal(debugAvailability({debug_events:[{}]}).status,'saved_extent_unknown');
});
const page=(records,nextCursor=null)=>({formatVersion:'intake-diagnostics.v1',asOf:'2026-11-02',class:{id:'class'},sessionId:null,records,nextCursor});
test('one export collects every page under the same cutoff and annotates debug',async()=>{
 const calls=[];const result=await collectIntakeDiagnostics(async(after,asOf)=>{calls.push([after,asOf]);return after?page([{intakeId:'b'}]):page([{intakeId:'a',aiAssistance:{}}],'a');});
 assert.deepEqual(calls,[[null,null],['a','2026-11-02']]);assert.equal(result.recordCount,2);assert.equal(result.records[0].debugAvailability.status,'no_saved_debug');
});
test('failures, duplicates and changed cutoffs reject the whole download',async()=>{
 await assert.rejects(collectIntakeDiagnostics(async()=>{throw Error('RPC failed');}),/RPC failed/);
 await assert.rejects(collectIntakeDiagnostics(async(after)=>after?page([{intakeId:'a'}]):page([{intakeId:'a'}],'a')),/Duplicate/);
 await assert.rejects(collectIntakeDiagnostics(async(after)=>after?{...page([]),asOf:'changed'}:page([{intakeId:'a'}],'a')),/snapshot changed/);
});
test('empty selection yields an empty export without fabricated debug',async()=>{assert.equal((await collectIntakeDiagnostics(async()=>page([]))).recordCount,0);});
