import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {thresholdSweep} from '../src/threshold-sweep.js';
import {evaluate} from '../src/engine.js';
import {scenarios} from '../src/data.js';
import {generateStress} from '../src/stress.js';

test('every threshold range equals independent evaluation for all demo datasets',()=>{
  for(const rows of [scenarios,generateStress(200,2026),generateStress(1000,2026)]) {
    const ranges=thresholdSweep(rows);let next=1;
    for(const {from,to,...metrics} of ranges) {
      assert.equal(from,next);assert.ok(to>=from);
      for(let threshold=from;threshold<=to;threshold++)assert.deepEqual(metrics,evaluate(rows,threshold));
      next=to+1;
    }
    assert.equal(next,101);
    for(let i=1;i<ranges.length;i++)assert.ok(ranges[i].reviewed<ranges[i-1].reviewed);
  }
});
test('boundary scores zero and one hundred are handled inclusively',()=>{
  const low={...scenarios[0],amount:1,usualAmount:1,transfersHour:0,newRecipient:false,newDevice:false,callerPressure:false,fraud:false};
  const high={...low,amount:10,transfersHour:5,newRecipient:true,newDevice:true,callerPressure:true,fraud:true};
  assert.deepEqual(thresholdSweep([low,high]),[{from:1,to:100,tp:1,fp:0,tn:1,fn:0,reviewed:1,total:2,precision:1,recall:1}]);
});
test('empty and single-class samples retain undefined metrics as null',()=>{
  assert.deepEqual(thresholdSweep([]),[{from:1,to:100,tp:0,fp:0,tn:0,fn:0,reviewed:0,total:0,precision:null,recall:null}]);
  for(const range of thresholdSweep(scenarios.map(t=>({...t,fraud:false}))))assert.equal(range.recall,null);
  for(const range of thresholdSweep(scenarios.map(t=>({...t,fraud:true}))))assert.equal(range.fp,0);
});
test('sweep does not mutate inputs and outputs are independent on repeated calls',()=>{
  const rows=scenarios.map(t=>Object.freeze({...t}));Object.freeze(rows);
  const result=thresholdSweep(rows),expected=thresholdSweep(rows);result[0].to=999;
  assert.deepEqual(thresholdSweep(rows),expected);
});
test('invalid input fields and nonboolean labels are rejected',()=>{
  for(const patch of [{fraud:undefined},{fraud:'false'},{amount:NaN},{newDevice:1}])
    assert.throws(()=>thresholdSweep([{...scenarios[0],...patch}]));
});
test('sweep is connected to laboratory and experiment export without auto selection',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(html,/id="threshold-sweep"/);
  assert.match(app,/thresholdSweep:thresholdSweep\(scenarios\)/);
  assert.match(app,/renderThresholdSweep\(\)/);
});
