import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoSnapshot} from '../scripts/verify-demo.js';
test('jury demo snapshot is reproducible and reconciles every scenario',()=>{
 const report=demoSnapshot();assert.deepEqual(report,demoSnapshot());assert.equal(report.experiments.length,9);
 for(const e of report.experiments){assert.equal(e.metrics.total,e.size);assert.equal(e.metrics.tp+e.metrics.fp+e.metrics.tn+e.metrics.fn,e.size);assert.equal(e.workload.minutes,e.metrics.reviewed*5);}
 const base=report.experiments.find(e=>e.size===16&&e.threshold===50);assert.equal(base.metrics.reviewed,6);assert.equal(base.metrics.fn,2);assert.equal(base.capacity.handled,5);
});
test('markup contains named navigation, keyboard destination and skip link',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/href="#main-content"/);assert.match(html,/id="main-content" tabindex="-1"/);
 assert.match(html,/<nav aria-label="Разделы BankGuard">/);assert.match(html,/aria-current="page"/);
 assert.match(html,/id="detail" tabindex="-1" aria-label="Выбранная операция"/);
});
