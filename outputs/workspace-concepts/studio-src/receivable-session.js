import {ensureOutcomes} from './outcomes-model.js';

const receivableStorageKey=industry=>'integral-partial-payment-v1/'+industry;
const savedReceivableCases=new WeakMap();

export function restoreReceivableCase(d){
 let raw,saved;
 try{raw=sessionStorage.getItem(receivableStorageKey(d.id));saved=JSON.parse(raw);}catch{return d;}
 const c=saved?.caseData;
 if(saved?.industry!==d.id||c?.id!=='receivable'||!Number.isSafeInteger(c.revision)||c.revision<1||
    !Number.isInteger(c.stage)||c.stage<1||c.stage>3||c.imported!==true||c.complete!==(c.stage===3)||
    !Array.isArray(c.history)||!c.history.every(h=>h&&typeof h.action==='string'&&typeof h.at==='string')||
    ![c.invoicePence,c.receiptPence,c.allocatedPence,c.disputedPence].every(v=>Number.isSafeInteger(v)&&v>=0)||
    c.allocatedPence>c.invoicePence||c.allocatedPence!==(c.stage>=2?c.receiptPence:0))return d;
 ensureOutcomes(d).cases.receivable=c;
 savedReceivableCases.set(d,raw);
 return d;
}

export function persistReceivableCase(d){
 const c=d.outcomePractice?.cases.receivable;
 if(!c?.revision)return;
 const key=receivableStorageKey(d.id);
 try{
  if(!c.imported){
   if(savedReceivableCases.has(d)){sessionStorage.removeItem(key);savedReceivableCases.delete(d);}
   return;
  }
  const raw=JSON.stringify({industry:d.id,caseData:c});
  if(savedReceivableCases.get(d)!==raw){sessionStorage.setItem(key,raw);savedReceivableCases.set(d,raw);}
 }catch{}
}
