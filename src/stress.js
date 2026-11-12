// Reproducible synthetic workload, not statistical validation against bank data.
// Fraud labels are latent scenario choices, not outputs of scoring rules.
export function generateStress(count=200,seed=2026){
 if(!Number.isInteger(count)||count<1||count>5000)throw new Error('Размер выборки: 1–5000');
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Seed: uint32');
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 return Array.from({length:count},(_,i)=>{
  const fraud=random()<0.15, usualAmount=5000+Math.floor(random()*20)*5000;
  // Overlapping distributions deliberately include suspicious legitimate and quiet fraud cases.
  const ratio=fraud?(0.1+random()*9):(0.2+random()*6);
  return {id:`ST-${String(i+1).padStart(5,'0')}`,title:'Синтетический перевод',client:`Синтетический профиль ${i+1}`,amount:Math.max(1,Math.round(usualAmount*ratio)),usualAmount,transfersHour:random()<(fraud?0.4:0.12)?5+Math.floor(random()*6):1+Math.floor(random()*3),newRecipient:random()<(fraud?0.7:0.25),newDevice:random()<(fraud?0.4:0.12),callerPressure:random()<(fraud?0.45:0.03),fraud};
 });
}
