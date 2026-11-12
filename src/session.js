import {decision, VERSION} from './engine.js';
import {scenarios} from './data.js';
import {generateStress} from './stress.js';
export const MAX_SESSION_BYTES=2_000_000;
export const MAX_SESSION_ENTRIES=5000;
// Only inputs are stored. Derived scores/reasons are recalculated on import.
function packSession(state){
 return JSON.stringify({schema:'bankguard-session-1',synthetic:true,version:VERSION,
  datasetSize:state.datasetSize,threshold:state.threshold,minutesPerReview:state.minutesPerReview,capacity:state.capacity,
  entries:state.entries.map(({id,action,note,time,threshold})=>({id,action,note,time,threshold}))});
}
function assertSize(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SESSION_BYTES)throw new Error('Файл сессии слишком большой (лимит 2 МБ)');
}
// Only built-in synthetic data can be restored. Scores/reasons are recomputed.
export function parseSession(text){
 assertSize(text);
 // UTF-8 BOM is common in files saved by Windows editors.
 const s=JSON.parse(text.replace(/^\uFEFF/,''));
 if(!s||s.schema!=='bankguard-session-1'||s.synthetic!==true||s.version!==VERSION)throw new Error('Несовместимый формат демо-сессии');
 if(![16,200,1000].includes(s.datasetSize))throw new Error('Неизвестный набор данных');
 const rows=s.datasetSize===16?scenarios:generateStress(s.datasetSize,2026),byId=new Map(rows.map(t=>[t.id,t]));
 if(!Number.isInteger(s.threshold))throw new Error('Не указан целочисленный порог сессии');
 decision(rows[0],s.threshold);
 if(!Number.isFinite(s.minutesPerReview)||s.minutesPerReview<=0||s.minutesPerReview>120||!Number.isInteger(s.capacity)||s.capacity<0||s.capacity>5000)throw new Error('Некорректные параметры эксперимента');
 if(!Array.isArray(s.entries))throw new Error('Некорректный журнал');
 if(s.entries.length>MAX_SESSION_ENTRIES)throw new Error('Лимит журнала: 5000 записей. Сохраните сессию и начните новый журнал.');
 const entries=s.entries.map(e=>{
  if(!e||!Number.isInteger(e.threshold)||!byId.has(e.id)||!['Снято с проверки','Эскалировано'].includes(e.action)||typeof e.note!=='string'||!e.note.trim()||e.note.length>240||typeof e.time!=='string'||!Number.isFinite(Date.parse(e.time)))throw new Error('Некорректная запись журнала');
  const r=decision(byId.get(e.id),e.threshold);
  return {id:e.id,action:e.action,note:e.note.trim(),time:new Date(e.time).toISOString(),threshold:e.threshold,risk:r.score,reasons:r.reasons,version:VERSION};
 });
 const state={datasetSize:s.datasetSize,threshold:s.threshold,minutesPerReview:s.minutesPerReview,capacity:s.capacity,entries};
 // Normalization (for example a short date to ISO) must not make accepted data unsavable.
 assertSize(packSession(state));
 return state;
}
export function serializeSession(state){
 return packSession(parseSession(packSession(state)));
}
export function appendSessionEntry(state,entry){
 const next={...state,entries:[entry,...state.entries]};
 // Reserve the largest allowed experiment header. Temporary invalid UI inputs
 // must not stop analyst decisions, and fixing them later must still fit.
 serializeSession({...next,threshold:100,minutesPerReview:120,capacity:5000});
 return next;
}
