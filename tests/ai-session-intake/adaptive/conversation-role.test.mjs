import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CONVERSATION_VERSION,CONVERSATION_INSTRUCTIONS,parseConversationReply} from '../../../.test-api/src/intakeConversation.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../fixtures/${name}`,import.meta.url),'utf8'));
test('actual failed conversation documents support drift despite known work and direction',()=>{
 const f=read('pr88-support-drift.json');
 const original=read('conversation-acceptance.json').cases.find(c=>c.id==='S7-6-prefix-5');
 assert.deepEqual(f.conversation,original.conversation);
 assert.equal(f.reply.readyForReview,false);assert.equal(f.expectedReadyForReview,true);
 assert.match(f.reply.reason,/support/);assert.match(f.reply.assistantMessage,/teacher/);
});
test('revised role stays compact and parser preserves model close choice (no automatic gate)',()=>{
 assert.equal(CONVERSATION_VERSION,'intake-conversation.v2');
 assert.ok(CONVERSATION_INSTRUCTIONS.length<3000);
 for(const readyForReview of [false,true]){
  assert.equal(parseConversationReply({assistantMessage:'Check your summary.',readyForReview,reason:'Context'}).readyForReview,readyForReview);
 }
});
