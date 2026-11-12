import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulator} from '../src/simulator.js';
import {scenarios} from '../src/data.js';
test('simulator starts without a result and clears it on edit/reset', () => {
 const s=createSimulator();assert.equal(s.current(),null);
 s.calculate(scenarios[0],50);assert.ok(s.current());
 s.invalidate();assert.equal(s.current(),null);
});
test('invalid calculation removes previous successful result', () => {
 const s=createSimulator();s.calculate(scenarios[0],50);
 assert.throws(()=>s.calculate({...scenarios[0],amount:-1},50));
 assert.equal(s.current(),null);
 assert.throws(()=>s.calculate(scenarios[0],0));assert.equal(s.current(),null);
});
test('simulator input and output cannot mutate stored successful inputs', () => {
 const s=createSimulator(), input={...scenarios[0]};s.calculate(input,50);
 input.amount=-1;const copy=s.current();copy.amount=-2;
 assert.equal(s.current().amount,scenarios[0].amount);
});
test('simulator can recover after invalid inputs', () => {
 const s=createSimulator();assert.throws(()=>s.calculate({},50));
 const r=s.calculate(scenarios[0],50);assert.equal(typeof r.score,'number');
 assert.deepEqual(s.current(),scenarios[0]);
});
