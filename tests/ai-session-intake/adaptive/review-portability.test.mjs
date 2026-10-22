import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=new URL('../../../src/',import.meta.url);
const collisions=files=>{const seen=new Map(),out=[];for(const file of files){if(!/\.[cm]?[jt]sx?$/.test(file))continue;const key=file.replace(/\.[cm]?[jt]sx?$/,'').toLowerCase();if(seen.has(key))out.push([seen.get(key),file]);else seen.set(key,file);}return out;};
test('extensionless module names stay unique on case-insensitive filesystems',()=>{
 assert.equal(collisions(['IntakeReview.tsx','intakeReview.ts']).length,1);
 const walk=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);
 assert.deepEqual(collisions(walk(path.resolve(root.pathname))),[]);
});
