import {decision,evaluate} from './engine.js';
// Post-hoc analysis of synthetic labels only. Never used to score or prioritize.
export function errorCases(rows,threshold=50){
 evaluate(rows,threshold); // Validate labels and threshold, including empty datasets.
 const falseAlerts=[],misses=[];
 for(const row of rows){
  const result=decision(row,threshold);
  if(result.review===row.fraud)continue;
  const item={id:row.id,title:row.title,risk:result.score,threshold,reasons:result.reasons,
   syntheticLabel:row.fraud?'fraud':'legitimate',review:result.review};
  (result.review?falseAlerts:misses).push(item);
 }
 const ordered=items=>items.sort((a,b)=>b.risk-a.risk||a.id.localeCompare(b.id));
 return {synthetic:true,falseAlerts:ordered(falseAlerts),misses:ordered(misses)};
}
