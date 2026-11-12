import {decision} from './engine.js';
const questionsByRule={
 unusual_amount:{question:'Какова цель перевода и чем объясняется отличие от обычной суммы?',hypothesis:'Необычная сумма может быть как крупной законной покупкой, так и поводом для дополнительной проверки.'},
 new_recipient:{question:'Как клиент проверил реквизиты и назначение нового получателя?',hypothesis:'Новый получатель сам по себе не подтверждает злоупотребление.'},
 new_device:{question:'Подтверждает ли клиент смену устройства через доверенный канал?',hypothesis:'Смена устройства может быть обычной заменой телефона; происхождение события здесь не проверено.'},
 velocity:{question:'Есть ли понятное объяснение серии переводов и подтверждённая история операций?',hypothesis:'Частые переводы могут иметь законную причину; временная история в прототипе отсутствует.'},
 social_engineering:{question:'Можно ли независимо уточнить обстоятельства сообщения о давлении через официальный канал банка?',hypothesis:'Сообщение о давлении требует уточнения; прототип не проверяет звонок и не анализирует разговор.'}
};
// Strict allowlist: no synthetic answer key, revealing scenario title or arbitrary input properties.
export function casePacket(transaction,threshold=50){
 const result=decision(transaction,threshold);
 const facts={amount:transaction.amount,usualAmount:transaction.usualAmount,transfersHour:transaction.transfersHour,
  newRecipient:transaction.newRecipient,newDevice:transaction.newDevice,callerPressure:transaction.callerPressure};
 const questions=[{code:'independent_context',question:'Как независимо подтвердить контекст операции по утверждённому процессу банка?',hypothesis:'Низкий балл и отсутствие сигналов не доказывают безопасность.',answer:null}];
 for(const reason of result.reasons)questions.push({code:reason.code,...questionsByRule[reason.code],answer:null});
 return {schema:'bankguard-case-1',synthetic:true,transactionId:typeof transaction.id==='string'?transaction.id:null,
  facts:{source:'built-in synthetic demo; not verified banking evidence',values:facts},
  signals:{rulesVersion:result.version,risk:result.score,threshold,reviewSuggested:result.review,reasons:result.reasons},
  questions,status:'not_verified',automaticAction:false,
  limitations:['Вопросы и гипотезы не являются выводами о клиенте.','Ответы не собраны и не подтверждены; вопросы не выполнены автоматически.','Пакет не подписан и не является банковским доказательством.','Реальные блокировки, звонки и переводы не выполняются.']};
}
