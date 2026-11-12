import test from 'node:test';
import assert from 'node:assert/strict';
import {casePacket} from '../src/case-packet.js';
import {scenarios} from '../src/data.js';
import {score} from '../src/engine.js';
test('case packet separates facts, signals and unanswered questions',()=>{
 const p=casePacket(scenarios[1],50);
 assert.equal(p.schema,'bankguard-case-1');assert.equal(p.signals.risk,75);
 assert.equal(p.facts.values.amount,650000);assert.equal(p.status,'not_verified');
 assert.equal(p.automaticAction,false);assert.ok(p.questions.every(q=>q.answer===null&&q.hypothesis));
});
test('case packet excludes labels, revealing titles, client and arbitrary properties',()=>{
 const row={...scenarios[1],title:'ANSWER-KEY',client:'PRIVATE-NAME',secret:'SECRET'};
 const p=casePacket(row),text=JSON.stringify(p);
 assert.ok(!text.includes('ANSWER-KEY')&&!text.includes('PRIVATE-NAME')&&!text.includes('SECRET'));
 assert.ok(!text.includes('"fraud"'));assert.deepEqual(p,casePacket({...row,fraud:!row.fraud}));
});
test('questions follow actual triggered rules without inventing observations',()=>{
 for(const row of scenarios){
  const p=casePacket(row),codes=score(row).reasons.map(r=>r.code);
  assert.deepEqual(p.questions.slice(1).map(q=>q.code),codes);
  assert.deepEqual(p.signals.reasons,score(row).reasons);
 }
});
test('no-signal case keeps a safety caveat and no automated conclusion',()=>{
 const p=casePacket(scenarios[0]);assert.equal(p.signals.risk,0);
 assert.equal(p.questions.length,1);assert.equal(p.status,'not_verified');assert.equal(p.automaticAction,false);
});
test('packet is deterministic, read-only and validates inputs',()=>{
 const before=JSON.stringify(scenarios[1]);assert.deepEqual(casePacket(scenarios[1]),casePacket(scenarios[1]));
 assert.equal(JSON.stringify(scenarios[1]),before);
 assert.throws(()=>casePacket(scenarios[1],0));assert.throws(()=>casePacket({...scenarios[1],amount:-1}));
});
