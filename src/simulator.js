import {decision} from './engine.js';
// No stale result survives an edit or a failed calculation.
export function createSimulator() {
 let transaction = null;
 return {
  invalidate() { transaction = null; },
  calculate(input, threshold) {
   transaction = null;
   const candidate = {...input};
   const result = decision(candidate, threshold);
   transaction = candidate;
   return result;
  },
  current() { return transaction ? {...transaction} : null; }
 };
}
