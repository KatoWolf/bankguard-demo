import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseRequiredNumber} from '../src/numeric-input.js';
import {capacityEvaluation,workload} from '../src/engine.js';
import {createSimulator} from '../src/simulator.js';
import {scenarios} from '../src/data.js';

test('missing numeric inputs are rejected rather than coerced to zero',()=>{
  for(const value of ['', ' ', '\t\n', null, undefined, [], {}, 0])
    assert.throws(()=>parseRequiredNumber(value,'Ёмкость'),/Заполните поле «Ёмкость»/);
});
test('explicit zero and finite numbers remain supported',()=>{
  for(const [input,expected] of [['0',0],[' 0 ',0],['5',5],['0.5',0.5],['1e3',1000]])
    assert.equal(parseRequiredNumber(input,'Число'),expected);
  for(const value of ['NaN','Infinity','-Infinity','1e309','abc'])
    assert.throws(()=>parseRequiredNumber(value,'Число'),/конечное число/);
});
test('required parsing preserves downstream domain limits',()=>{
  assert.equal(capacityEvaluation(scenarios,50,parseRequiredNumber('0','Ёмкость')).handled,0);
  assert.throws(()=>capacityEvaluation(scenarios,50,parseRequiredNumber('0.5','Ёмкость')),/Ёмкость/);
  assert.throws(()=>workload(scenarios,50,parseRequiredNumber('0','Время')),/Время/);
});
test('blank transfer count cannot produce a simulation while explicit zero can',()=>{
  const simulator=createSimulator(),read=value=>({...scenarios[0],transfersHour:parseRequiredNumber(value,'Переводов за час')});
  assert.throws(()=>simulator.calculate(read(''),50),/Заполните поле/);
  assert.equal(simulator.current(),null);
  simulator.calculate(read('0'),50);assert.equal(simulator.current().transfersHour,0);
});
test('numeric controls and save/export paths use required parsing',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  for(const id of ['capacity','review-minutes']) {
    assert.match(html,new RegExp(`<input[^>]*id="${id}"[^>]*required`));
    assert.ok(!app.includes(`Number($('#${id}').value)`));
  }
  assert.match(html,/<input[^>]*name="transfersHour"[^>]*required/);
  assert.ok(app.includes('parseRequiredNumber(data.get(k),labels[k])'));
});
