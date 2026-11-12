import test from 'node:test';
import assert from 'node:assert/strict';
import {errorCases} from '../src/diagnostics.js';
import {scenarios} from '../src/data.js';
import {generateStress} from '../src/stress.js';
import {evaluate,score} from '../src/engine.js';
test('baseline identifies the actual false alert and two misses',()=>{
 const d=errorCases(scenarios,50);
 assert.deepEqual(d.falseAlerts.map(r=>r.id),['TX-0013']);
 assert.deepEqual(d.misses.map(r=>r.id),['TX-0012','TX-0010']);
 assert.deepEqual(d.misses.map(r=>r.risk),[35,15]);
 assert.equal(d.falseAlerts[0].risk,60);assert.equal(d.synthetic,true);
});
test('diagnostic case counts equal the confusion matrix across datasets and thresholds',()=>{
 for(const rows of [scenarios,generateStress(200),generateStress(1000)])for(const threshold of [1,25,50,75,100]){
  const d=errorCases(rows,threshold),m=evaluate(rows,threshold);
  assert.equal(d.falseAlerts.length,m.fp);assert.equal(d.misses.length,m.fn);
  assert.ok(d.falseAlerts.every(r=>r.review&&r.syntheticLabel==='legitimate'&&r.risk>=threshold));
  assert.ok(d.misses.every(r=>!r.review&&r.syntheticLabel==='fraud'&&r.risk<threshold));
 }
});
test('diagnostics preserve inputs and never alter scores using labels',()=>{
 const before=JSON.stringify(scenarios),scores=scenarios.map(score);
 errorCases(scenarios,50);assert.equal(JSON.stringify(scenarios),before);
 assert.deepEqual(scenarios.map(row=>score({...row,fraud:!row.fraud})),scores);
});
test('diagnostics include reasons and deterministic risk then ID ordering',()=>{
 const rows=generateStress(200),d=errorCases(rows,1);
 for(const [i,row] of d.falseAlerts.entries()){
  assert.deepEqual(row.reasons,score(rows.find(t=>t.id===row.id)).reasons);
  if(i){const prev=d.falseAlerts[i-1];assert.ok(prev.risk>row.risk||prev.risk===row.risk&&prev.id.localeCompare(row.id)<0);}
 }
 assert.deepEqual(d,errorCases(rows,1));
});
test('empty and invalid diagnostic inputs match engine validation',()=>{
 assert.deepEqual(errorCases([],50),{synthetic:true,falseAlerts:[],misses:[]});
 assert.throws(()=>errorCases([],0));assert.throws(()=>errorCases([{...scenarios[0],fraud:undefined}],50));
});
