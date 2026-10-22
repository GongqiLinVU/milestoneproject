import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseConversationReply,CONVERSATION_INSTRUCTIONS} from '../../../.test-api/src/intakeConversation.js';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/conversation-acceptance.json',import.meta.url),'utf8'));
test('golden conversation prefixes make the actual late-closing regression explicit',()=>{
 const later=fixture.cases.filter(c=>c.historicalReply&&c.expectedReadyForReview);
 assert.equal(later.length,4);assert.ok(later.every(c=>c.historicalReply.readyForReview===false));
 assert.equal(fixture.cases.find(c=>c.id==='S7-6-unknown-cause').conversation.at(-1).actor,'student');
});
test('small dialogue contract preserves model choices and does not impose minimum rounds',()=>{
 for(const readyForReview of [true,false])assert.equal(parseConversationReply({assistantMessage:'Check your summary.',readyForReview,reason:'Enough information'}).readyForReview,readyForReview);
 assert.throws(()=>parseConversationReply({assistantMessage:'Hello',readyForReview:'yes',reason:'x'}));
 assert.ok(CONVERSATION_INSTRUCTIONS.length<3000);
});
