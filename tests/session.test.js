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

test('UTF-8 BOM from Windows editors is accepted',()=>{
 assert.deepEqual(parseSession('\uFEFF'+serializeSession(state)),parseSession(serializeSession(state)));
});
test('byte size limit applies to Unicode input rather than JS character count',()=>{
 const text=JSON.stringify({...state,note:'я'.repeat(1_000_000)});
 assert.throws(()=>parseSession(text),/слишком большой/);
});

import {appendSessionEntry,MAX_SESSION_BYTES} from '../src/session.js';
test('3000 imported decisions re-export without derived-field inflation',()=>{
 const s={...state,entries:Array.from({length:3000},()=>({...state.entries[0],note:'a'.repeat(240),time:'2026-11-12T00:00:00Z'}))};
 const restored=parseSession(JSON.stringify({schema:'bankguard-session-1',synthetic:true,version:'rules-1.0',...s}));
 assert.ok(restored.entries[0].reasons.length);
 const text=serializeSession(restored);assert.ok(new TextEncoder().encode(text).length<=MAX_SESSION_BYTES);
 assert.equal(JSON.parse(text).entries[0].reasons,undefined);assert.equal(JSON.parse(text).entries[0].risk,undefined);
 assert.deepEqual(parseSession(text),restored);
});
test('full journal remains exportable when next decision is rejected',()=>{
 const full={...state,entries:Array.from({length:5000},()=>({...state.entries[0]}))};
 const before=serializeSession(full);
 assert.throws(()=>appendSessionEntry(full,state.entries[0]),/5000/);
 assert.equal(full.entries.length,5000);assert.equal(serializeSession(full),before);
});
test('new decision is rejected before exceeding UTF-8 byte capacity',()=>{
 const entry={...state.entries[0],note:'я'.repeat(240)};
 const base={...state,entries:[]};
 // Build a valid near-limit session with fewer than 5000 entries.
 const header=serializeSession(base).length;
 const bytes=new TextEncoder().encode(JSON.stringify(entry)).length+1;
 const count=Math.floor((MAX_SESSION_BYTES-header)/bytes);
 base.entries=Array.from({length:count},()=>({...entry}));
 const before=serializeSession(base);
 assert.throws(()=>appendSessionEntry(base,entry),/слишком большой/);
 assert.equal(serializeSession(base),before);
});
test('canonical session export is stable through repeated normalization',()=>{
 const s={...state,entries:[{...state.entries[0],note:'  Проверено  ',time:'2026-11-12'}]};
 const first=serializeSession(s);assert.equal(serializeSession(parseSession(first)),first);
});

test('normalization cannot accept a near-limit import that becomes too large to save',()=>{
 const header={schema:'bankguard-session-1',synthetic:true,version:'rules-1.0',...state,entries:[]};
 const e={...state.entries[0],note:'я'.repeat(240),time:'2026'};
 const overhead=new TextEncoder().encode(JSON.stringify(header)).length;
 const perEntry=new TextEncoder().encode(JSON.stringify(e)).length+1;
 header.entries=Array.from({length:Math.floor((MAX_SESSION_BYTES-overhead)/perEntry)},()=>({...e}));
 const raw=JSON.stringify(header);assert.ok(new TextEncoder().encode(raw).length<=MAX_SESSION_BYTES);
 assert.throws(()=>parseSession(raw),/слишком большой/);
});
test('journal limit checks are independent of temporarily invalid workload inputs',()=>{
 const result=appendSessionEntry({...state,minutesPerReview:0,capacity:NaN},state.entries[0]);
 assert.equal(result.entries.length,2);assert.equal(state.entries.length,1);
});
