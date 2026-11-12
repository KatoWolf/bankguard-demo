export const VERSION = 'rules-1.0';
export const DEFAULT_THRESHOLD = 50;
export function validate(t) {
  for (const k of ['amount','usualAmount','transfersHour']) if (!Number.isFinite(t[k]) || t[k] < 0) throw new Error(`Некорректное поле: ${k}`);
  if (t.amount <= 0 || t.usualAmount <= 0 || t.amount>1e10 || t.usualAmount>1e10) throw new Error('Сумма должна быть больше нуля и не более 10 млрд');
  if (!Number.isInteger(t.transfersHour) || t.transfersHour>10000) throw new Error('Число переводов должно быть целым от 0 до 10000');
  for (const k of ['newRecipient','newDevice','callerPressure']) if(typeof t[k]!=='boolean') throw new Error(`Ожидается флаг: ${k}`);
  return t;
}
export function score(t) {
  validate(t); const reasons=[]; const add=(condition,code,label,points)=>{if(condition)reasons.push({code,label,points});};
  const ratio=t.amount/t.usualAmount;
  add(ratio>=5,'unusual_amount','Сумма ≥ 5 обычных переводов',25);
  add(t.newRecipient,'new_recipient','Новый получатель',15);
  add(t.newDevice,'new_device','Новое устройство',20);
  add(t.transfersHour>=5,'velocity','Не менее 5 переводов за час',20);
  add(t.callerPressure,'social_engineering','Клиент сообщил о давлении звонящего',35);
  return {score:Math.min(100,reasons.reduce((s,r)=>s+r.points,0)),reasons,version:VERSION};
}
export function decision(t,threshold=DEFAULT_THRESHOLD) {
  if(!Number.isInteger(threshold)||threshold<1||threshold>100)throw new Error('Порог: целое число 1–100');
  const result=score(t); return {...result,review:result.score>=threshold};
}
export function evaluate(rows,threshold) {
  const m={tp:0,fp:0,tn:0,fn:0,reviewed:0,total:rows.length};
  for(const t of rows){if(typeof t.fraud!=='boolean')throw new Error('Отсутствует синтетическая метка');const p=decision(t,threshold).review;m[p?(t.fraud?'tp':'fp'):(t.fraud?'fn':'tn')]++;if(p)m.reviewed++;}
  m.precision=m.tp+m.fp?m.tp/(m.tp+m.fp):null;m.recall=m.tp+m.fn?m.tp/(m.tp+m.fn):null;return m;
}
export function csv(rows) {
  const cols=['id','amount','risk','status','reason'];
  const escape=v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
  return '\uFEFF'+[cols,...rows.map(r=>cols.map(c=>r[c]))].map(r=>r.map(escape).join(',')).join('\r\n');
}

// Resolutions are analyst workflow state, never synthetic ground truth.
export function pendingQueue(rows, threshold, resolvedIds = new Set()) {
  return rows.filter(t => decision(t, threshold).review && !resolvedIds.has(t.id))
    .sort((a,b) => score(b).score-score(a).score || a.id.localeCompare(b.id));
}
export function compareThresholds(rows, threshold, baseline=DEFAULT_THRESHOLD) {
  const current=evaluate(rows,threshold), reference=evaluate(rows,baseline);
  return {threshold,baseline,current,reference,delta:{reviews:current.reviewed-reference.reviewed,falseAlerts:current.fp-reference.fp,misses:current.fn-reference.fn}};
}
export function workload(rows, threshold, minutesPerReview=5) {
  if (!Number.isFinite(minutesPerReview)||minutesPerReview<=0||minutesPerReview>120) throw new Error('Время проверки: больше 0 и не более 120 минут');
  const metrics=evaluate(rows,threshold);
  return {reviews:metrics.reviewed,minutes:metrics.reviewed*minutesPerReview,minutesPerReview};
}

export function capacityEvaluation(rows,threshold,capacity){
 if(!Number.isInteger(capacity)||capacity<0)throw new Error('Ёмкость должна быть неотрицательным целым числом');
 evaluate(rows,threshold);
 const alerts=pendingQueue(rows,threshold),handled=alerts.slice(0,capacity),waiting=alerts.slice(capacity);
 const totalFraud=rows.filter(t=>t.fraud).length,found=handled.filter(t=>t.fraud).length;
 return {capacity,alerts:alerts.length,handled:handled.length,waiting:waiting.length,found,waitingFraud:waiting.filter(t=>t.fraud).length,belowThresholdFraud:rows.filter(t=>t.fraud&&!decision(t,threshold).review).length,recallWithCapacity:totalFraud?found/totalFraud:null};
}
