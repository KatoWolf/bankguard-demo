import test from 'node:test';import assert from 'node:assert/strict';import {score,decision,evaluate,csv} from '../src/engine.js';import {scenarios} from '../src/data.js';
const t={amount:25000,usualAmount:25000,transfersHour:1,newRecipient:false,newDevice:false,callerPressure:false};
test('ordinary transaction has zero risk',()=>assert.equal(score(t).score,0));
test('exact amount boundary',()=>{assert.equal(score({...t,amount:124999}).score,0);assert.equal(score({...t,amount:125000}).score,25);});
test('each rule contributes independently',()=>{for(const [key,value,points]of [['newRecipient',true,15],['newDevice',true,20],['callerPressure',true,35],['transfersHour',5,20]])assert.equal(score({...t,[key]:value}).score,points);});
test('risk cap is 100, reason points preserved',()=>{const r=score({...t,amount:200000,newRecipient:true,newDevice:true,callerPressure:true,transfersHour:8});assert.equal(r.score,100);assert.equal(r.reasons.reduce((a,b)=>a+b.points,0),115);});
test('inclusive review threshold',()=>{assert.equal(decision({...t,newRecipient:true,callerPressure:true},50).review,true);assert.equal(decision({...t,newRecipient:true,callerPressure:true},51).review,false);});
test('invalid transaction values rejected',()=>{for(const patch of [{amount:NaN},{amount:-1},{amount:Infinity},{usualAmount:0},{transfersHour:1.2},{newDevice:'false'},{callerPressure:undefined},{amount:1e11}])assert.throws(()=>score({...t,...patch}));});
test('invalid thresholds rejected',()=>{for(const v of [0,101,NaN,'50',1.5])assert.throws(()=>decision(t,v));});
test('default synthetic matrix is reproducible and includes misses/false alerts',()=>{const m=evaluate(scenarios,50);assert.equal(m.total,16);assert.equal(m.tp,5);assert.equal(m.fp,1);assert.equal(m.fn,2);assert.equal(m.tn,8);assert.equal(m.reviewed,6);});
test('empty metrics do not divide by zero',()=>{const m=evaluate([],50);assert.equal(m.precision,null);assert.equal(m.recall,null);});
test('increasing threshold cannot increase reviews',()=>{let prev=Infinity;for(let i=1;i<=100;i++){const n=evaluate(scenarios,i).reviewed;assert.ok(n<=prev);prev=n;}});
test('no data mutation',()=>{const before=JSON.stringify(scenarios);evaluate(scenarios,50);assert.equal(JSON.stringify(scenarios),before);});
test('CSV handles quoting and spreadsheet formulas',()=>{const out=csv([{id:'=SUM(A1)',reason:'hello,"world"\nnew'}]);assert.ok(out.includes("\"'=SUM(A1)\""));assert.ok(out.includes('"hello,""world""\nnew"'));});

import {pendingQueue,compareThresholds,workload} from '../src/engine.js';
test('queue is risk ordered, unresolved only and does not mutate fixture',()=>{const before=JSON.stringify(scenarios);const q=pendingQueue(scenarios,50,new Set(['TX-0002']));assert.equal(q.length,5);assert.equal(q[0].id,'TX-0003');assert.ok(q.every(r=>r.id!=='TX-0002'));assert.equal(JSON.stringify(scenarios),before);});
test('empty pending queue after all reviews handled',()=>assert.equal(pendingQueue(scenarios,50,new Set(scenarios.map(t=>t.id))).length,0));
test('queue uses current threshold without changing decisions',()=>{const ids=new Set(['TX-0002']);assert.equal(pendingQueue(scenarios,100,ids).length,0);assert.equal(ids.size,1);});
test('baseline comparison is zero at baseline',()=>assert.deepEqual(compareThresholds(scenarios,50).delta,{reviews:0,falseAlerts:0,misses:0}));
test('threshold 1 exposes workload versus recall tradeoff',()=>assert.deepEqual(compareThresholds(scenarios,1).delta,{reviews:7,falseAlerts:5,misses:-2}));
test('workload is an explicit assumption',()=>{assert.equal(workload(scenarios,50).minutes,30);assert.equal(workload(scenarios,1,10).minutes,130);for(const n of [0,-1,NaN,Infinity,121])assert.throws(()=>workload(scenarios,50,n));});

import {generateStress} from '../src/stress.js';
import {capacityEvaluation} from '../src/engine.js';
test('stress generation is deterministic and seed dependent',()=>{assert.deepEqual(generateStress(20,1),generateStress(20,1));assert.notDeepEqual(generateStress(20,1),generateStress(20,2));});
test('stress fixture validates, has unique IDs, both labels and no score leakage',()=>{const rows=generateStress(1000);assert.equal(new Set(rows.map(t=>t.id)).size,1000);assert.ok(rows.some(t=>t.fraud)&&rows.some(t=>!t.fraud));rows.forEach(t=>assert.equal(score(t).score,score({...t,fraud:!t.fraud}).score));});
test('generator rejects bad bounds',()=>{for(const c of [0,-1,5001,NaN,1.5])assert.throws(()=>generateStress(c));assert.throws(()=>generateStress(5,-1));});
test('capacity separates below-threshold misses from waiting',()=>{const r=capacityEvaluation(scenarios,50,0);assert.equal(r.handled,0);assert.equal(r.waiting,6);assert.equal(r.waitingFraud,5);assert.equal(r.belowThresholdFraud,2);assert.equal(r.recallWithCapacity,0);});
test('unlimited capacity reaches threshold recall',()=>assert.equal(capacityEvaluation(scenarios,50,100).recallWithCapacity,evaluate(scenarios,50).recall));
test('capacity refuses invalid inputs',()=>{for(const c of [-1,NaN,1.5])assert.throws(()=>capacityEvaluation(scenarios,50,c));});

test('CSV neutralizes formula prefixes hidden by whitespace or control characters',()=>{
 for(const value of ['=1+1','+1','-1','@SUM(A1)',' =1','\t=1','\r=1','\n=1']) {
  assert.ok(csv([{id:value}]).includes('"\''+value+'"'));
 }
});
test('stress capacity accounting reconciles at every threshold',()=>{
 const rows=generateStress(1000);
 for(const threshold of [1,25,50,75,100])for(const capacity of [0,5,100,1000]){
  const c=capacityEvaluation(rows,threshold,capacity), m=evaluate(rows,threshold);
  assert.equal(c.handled+c.waiting,c.alerts);assert.equal(c.alerts,m.reviewed);
  assert.equal(c.found+c.waitingFraud+c.belowThresholdFraud,m.tp+m.fn);
 }
});

test('all 32 rule combinations match independently computed scores and boundaries',()=>{
 const weights=[25,15,20,20,35];
 for(let mask=0;mask<32;mask++){
  const flags=weights.map((_,i)=>Boolean(mask&(1<<i)));
  const row={...t,amount:flags[0]?125000:25000,newRecipient:flags[1],newDevice:flags[2],transfersHour:flags[3]?5:1,callerPressure:flags[4]};
  const expected=Math.min(100,weights.reduce((n,w,i)=>n+(flags[i]?w:0),0));
  assert.equal(score(row).score,expected);assert.equal(score(row).reasons.length,flags.filter(Boolean).length);
  for(const threshold of [1,25,50,75,100])assert.equal(decision(row,threshold).review,expected>=threshold);
 }
});
test('authored scenario scores and labels stay stable',()=>{
 assert.deepEqual(scenarios.map(row=>score(row).score),[0,75,60,40,55,20,0,50,40,15,20,35,60,35,55,0]);
 assert.deepEqual(scenarios.filter(row=>row.fraud).map(row=>row.id),['TX-0002','TX-0003','TX-0005','TX-0008','TX-0010','TX-0012','TX-0015']);
});
test('empty collections cannot bypass invalid threshold checks',()=>{
 for(const threshold of [0,101,null,NaN,'50',1.5]){
  assert.throws(()=>evaluate([],threshold));assert.throws(()=>pendingQueue([],threshold));
  assert.throws(()=>workload([],threshold));assert.throws(()=>capacityEvaluation([],threshold,0));
  assert.throws(()=>compareThresholds([],threshold));assert.throws(()=>compareThresholds([],50,threshold));
 }
 assert.equal(evaluate([]).total,0);assert.deepEqual(pendingQueue([]),[]);
});
test('capacity bounds agree with session and UI limits',()=>{
 assert.throws(()=>capacityEvaluation(scenarios,50,5001));
 assert.equal(capacityEvaluation(scenarios,50,5000).handled,6);
});
test('capacity recall is undefined when the dataset has no fraud',()=>{
 const result=capacityEvaluation(scenarios.filter(row=>!row.fraud),50,5);
 assert.equal(result.recallWithCapacity,null);assert.equal(result.found,0);
});
