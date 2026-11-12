import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSession,serializeSession} from '../src/session.js';
const state={datasetSize:16,threshold:50,minutesPerReview:5,capacity:5,entries:[{id:'TX-0002',action:'Эскалировано',note:'Демо',time:'2026-11-12T12:00:00.000Z',threshold:50}]};
const fixture=()=>JSON.parse(serializeSession(state));
test('session round trip recomputes risk and preserves experiment',()=>{const data=parseSession(serializeSession(state));assert.equal(data.threshold,50);assert.equal(data.entries[0].note,'Демо');assert.equal(data.entries[0].risk,75);});
test('session ignores forged scores and extra imported properties',()=>{const s=fixture();s.entries[0].risk=0;s.entries[0].reasons=[];s.entries[0].html='<script>';const e=parseSession(JSON.stringify(s)).entries[0];assert.equal(e.risk,75);assert.ok(e.reasons.length);assert.equal(e.html,undefined);});
test('session rejects malformed or incompatible formats',()=>{for(const patch of [{schema:'other'},{synthetic:false},{version:'other'},{datasetSize:2},{threshold:0},{capacity:-1},{capacity:1.5},{minutesPerReview:0},{entries:null}])assert.throws(()=>parseSession(JSON.stringify({...fixture(),...patch})));assert.throws(()=>parseSession('{'));assert.throws(()=>parseSession(' '.repeat(2_000_001)));});
test('session rejects unknown IDs, decisions, invalid dates and empty comments',()=>{for(const patch of [{id:'someone-real'},{action:'block'},{note:' '},{note:'a'.repeat(241)},{time:'bad'},{threshold:101}]){const s=fixture();Object.assign(s.entries[0],patch);assert.throws(()=>parseSession(JSON.stringify(s)));}});
test('all supported synthetic datasets restore without importing transactions',()=>{for(const datasetSize of [16,200,1000]){const s={...state,datasetSize,entries:[]};assert.equal(parseSession(serializeSession(s)).datasetSize,datasetSize);}});

test('session requires explicit thresholds at both levels',()=>{
 for(const value of [undefined,null,'50',NaN,1.5]){
  const s=fixture();s.threshold=value;assert.throws(()=>parseSession(JSON.stringify(s)));
  const e=fixture();e.entries[0].threshold=value;assert.throws(()=>parseSession(JSON.stringify(e)));
 }
});
test('session normalizes comments and restores repeated decisions newest first',()=>{
 const s=fixture();s.entries[0].note='  Проверено  ';
 s.entries.push({...s.entries[0],action:'Снято с проверки',time:'2026-11-11T00:00:00Z'});
 const entries=parseSession(JSON.stringify(s)).entries;
 assert.equal(entries[0].note,'Проверено');
 const resolutions=new Map([...entries].reverse().map(e=>[e.id,e]));
 assert.equal(resolutions.get('TX-0002').action,'Эскалировано');
});
