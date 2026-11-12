// Number('') and Number(null) are zero, not evidence that the user entered zero.
export function parseRequiredNumber(value,label) {
  if(typeof value!=='string'||!value.trim())throw new Error(`Заполните поле «${label}»`);
  const number=Number(value);
  if(!Number.isFinite(number))throw new Error(`Введите конечное число: ${label}`);
  return number;
}
