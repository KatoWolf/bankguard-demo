import {decision, VERSION} from './engine.js';
import {scenarios} from './data.js';
import {generateStress} from './stress.js';
export const MAX_SESSION_BYTES=2_000_000;
// Only built-in synthetic data can be restored. Scores/reasons are recomputed.
export function parseSession(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SESSION_BYTES)throw new Error('Файл сессии слишком большой (лимит 2 МБ)');
 const s=JSON.parse(text);
 if(!s||s.schema!=='bankguard-session-1'||s.synthetic!==true||s.version!==VERSION)throw new Error('Несовместимый формат демо-сессии');
 if(![16,200,1000].includes(s.datasetSize))throw new Error('Неизвестный набор данных');
 const rows=s.datasetSize===16?scenarios:generateStress(s.datasetSize,2026),byId=new Map(rows.map(t=>[t.id,t]));
 if(!Number.isInteger(s.threshold))throw new Error('Не указан целочисленный порог сессии');
 decision(rows[0],s.threshold);
 if(!Number.isFinite(s.minutesPerReview)||s.minutesPerReview<=0||s.minutesPerReview>120||!Number.isInteger(s.capacity)||s.capacity<0||s.capacity>5000)throw new Error('Некорректные параметры эксперимента');
 if(!Array.isArray(s.entries)||s.entries.length>5000)throw new Error('Некорректный журнал');
 const entries=s.entries.map(e=>{
  if(!e||!Number.isInteger(e.threshold)||!byId.has(e.id)||!['Снято с проверки','Эскалировано'].includes(e.action)||typeof e.note!=='string'||!e.note.trim()||e.note.length>240||typeof e.time!=='string'||!Number.isFinite(Date.parse(e.time)))throw new Error('Некорректная запись журнала');
  const r=decision(byId.get(e.id),e.threshold);
  return {id:e.id,action:e.action,note:e.note.trim(),time:new Date(e.time).toISOString(),threshold:e.threshold,risk:r.score,reasons:r.reasons,version:VERSION};
 });
 return {datasetSize:s.datasetSize,threshold:s.threshold,minutesPerReview:s.minutesPerReview,capacity:s.capacity,entries};
}
export function serializeSession(state){
 const data={schema:'bankguard-session-1',synthetic:true,version:VERSION,...state};
 const text=JSON.stringify(data,null,2);parseSession(text);return text;
}
