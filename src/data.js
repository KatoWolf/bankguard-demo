// Synthetic scenarios only; labels are scenario authorship, not bank outcomes.
const base={usualAmount:25000,transfersHour:1,newRecipient:false,newDevice:false,callerPressure:false};
export const scenarios=[
 {title:'Обычный перевод',amount:18000,fraud:false},
 {title:'«Безопасный счёт»',amount:650000,newRecipient:true,callerPressure:true,fraud:true},
 {title:'Новое устройство и получатель',amount:220000,newRecipient:true,newDevice:true,fraud:true},
 {title:'Покупка мебели',amount:420000,usualAmount:60000,newRecipient:true,fraud:false},
 {title:'Серия мелких переводов',amount:12000,newRecipient:true,newDevice:true,transfersHour:8,fraud:true},
 {title:'Новый телефон клиента',amount:28000,newDevice:true,fraud:false},
 {title:'Оплата аренды',amount:220000,usualAmount:180000,fraud:false},
 {title:'Звонок лжесотрудника',amount:40000,callerPressure:true,newRecipient:true,fraud:true},
 {title:'Подарок родственнику',amount:150000,newRecipient:true,fraud:false},
 {title:'Скрытая социальная инженерия',amount:20000,newRecipient:true,fraud:true},
 {title:'Несколько покупок',amount:16000,transfersHour:6,fraud:false},
 {title:'Тестовый перевод злоумышленнику',amount:1000,newRecipient:true,newDevice:true,fraud:true},
 {title:'Переезд: новый телефон, арендодатель',amount:250000,usualAmount:50000,newDevice:true,newRecipient:true,fraud:false},
 {title:'Зарплата помощникам',amount:35000,transfersHour:7,newRecipient:true,fraud:false},
 {title:'Давление и новый телефон',amount:90000,newDevice:true,callerPressure:true,fraud:true},
 {title:'Коммунальные услуги',amount:32000,usualAmount:30000,fraud:false}
].map((s,i)=>({...base,...s,id:`TX-${String(i+1).padStart(4,'0')}`,client:`Демо-клиент ${i+1}`}));
