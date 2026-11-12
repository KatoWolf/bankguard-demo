import {score} from './engine.js';

// Descriptive synthetic evaluation, never a recommended production threshold.
// Score each operation once; equal adjacent outcomes are presented as ranges.
export function thresholdSweep(rows) {
  const bins=Array.from({length:101},()=>({fraud:0,legitimate:0}));
  let totalFraud=0;
  for(const row of rows) {
    if(typeof row.fraud!=='boolean')throw new Error('Отсутствует синтетическая метка');
    const risk=score(row).score;
    bins[risk][row.fraud?'fraud':'legitimate']++;
    if(row.fraud)totalFraud++;
  }
  const total=rows.length, totalLegitimate=total-totalFraud;
  let tp=totalFraud-bins[0].fraud,fp=totalLegitimate-bins[0].legitimate;
  const ranges=[];
  for(let threshold=1;threshold<=100;threshold++) {
    const reviewed=tp+fp,previous=ranges.at(-1);
    if(previous&&previous.reviewed===reviewed)previous.to=threshold;
    else ranges.push({from:threshold,to:threshold,tp,fp,tn:totalLegitimate-fp,
      fn:totalFraud-tp,reviewed,total,precision:reviewed?tp/reviewed:null,
      recall:totalFraud?tp/totalFraud:null});
    // An operation at this exact score is included at this threshold, not above it.
    tp-=bins[threshold].fraud;fp-=bins[threshold].legitimate;
  }
  return ranges;
}
