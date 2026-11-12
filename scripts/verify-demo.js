// Deterministic demo facts for a presentation. No network, files or real data.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {scenarios} from '../src/data.js';
import {generateStress} from '../src/stress.js';
import {evaluate,workload,capacityEvaluation,VERSION} from '../src/engine.js';
export function demoSnapshot(){
 return {synthetic:true,rulesVersion:VERSION,seed:2026,warning:'Not bank validation. Capacity assumes perfect analyst decisions.',experiments:[16,200,1000].flatMap(size=>{
  const rows=size===16?scenarios:generateStress(size,2026);
  return [1,50,100].map(threshold=>({size,threshold,metrics:evaluate(rows,threshold),workload:workload(rows,threshold,5),capacity:capacityEvaluation(rows,threshold,5)}));
 })};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))console.log(JSON.stringify(demoSnapshot(),null,2));
