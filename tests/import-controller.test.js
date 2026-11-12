import test from 'node:test';
import assert from 'node:assert/strict';
import {createImportController,hasLocalWork} from '../src/import-controller.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('a slow older import cannot overwrite a newer import',async()=>{
 const c=createImportController(),a=deferred(),b=deferred(),applied=[];
 const first=c.restore(()=>a.promise,JSON.parse,()=>true,s=>applied.push(s));
 const second=c.restore(()=>b.promise,JSON.parse,()=>true,s=>applied.push(s));
 b.resolve('{"new":true}');assert.equal(await second,'applied');
 a.resolve('{"old":true}');assert.equal(await first,'stale');assert.deepEqual(applied,[{new:true}]);
});
test('edits or reset during a file read invalidate the import',async()=>{
 const c=createImportController(),d=deferred();let applied=false,asked=false;
 const result=c.restore(()=>d.promise,JSON.parse,()=>{asked=true;return true;},()=>{applied=true;});
 c.invalidate();d.resolve('{}');assert.equal(await result,'stale');assert.equal(applied,false);assert.equal(asked,false);
});
test('stale read failures are ignored without overwriting newer status',async()=>{
 const c=createImportController(),d=deferred();const result=c.restore(()=>d.promise,JSON.parse,()=>true,()=>{});
 c.invalidate();d.reject(new Error('old read failed'));assert.equal(await result,'stale');
});
test('cancelled and malformed imports never apply changes',async()=>{
 const c=createImportController();let count=0;
 assert.equal(await c.restore(async()=>'{}',JSON.parse,()=>false,()=>count++),'cancelled');
 await assert.rejects(c.restore(async()=>'{',JSON.parse,()=>true,()=>count++));assert.equal(count,0);
});
test('draft-only work is protected while whitespace alone is not',()=>{
 assert.equal(hasLocalWork([],new Map([['id',' draft ']])),true);
 assert.equal(hasLocalWork([],new Map([['id','  ']])),false);
 assert.equal(hasLocalWork([{}],new Map()),true);
});
