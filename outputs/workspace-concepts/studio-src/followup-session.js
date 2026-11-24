import {ensureOutcomes,followupLinkedRows} from './outcomes-model.js';

const followupSessionPrefix='integral-followup-v1/';
const followupSaved=new WeakMap();

export function persistFollowupCase(d){
 const current=d.outcomePractice?.cases.followup;
 if(!current || !current.revision)return;
 const sam=d.contacts.find(row=>row.id===d.id+'-contact0');
 const contact=sam && {id:sam.id,callAllowed:sam.callAllowed,emailAllowed:sam.emailAllowed,queueStatus:sam.queueStatus,lastTouch:sam.lastTouch};
 const data=JSON.stringify({caseData:current,rows:followupLinkedRows(d,current),nextSalesId:d.nextSalesId,contact});
 if(data===followupSaved.get(d))return;
 try{sessionStorage.setItem(followupSessionPrefix+d.id,data);followupSaved.set(d,data);}catch{}
}

function restoreFollowupContact(d,saved){
 const sam=d.contacts.find(row=>row.id===d.id+'-contact0');
 if(!sam)return;
 const contact=saved.contact;
 if(contact?.id===sam.id && typeof contact.callAllowed==='boolean' && typeof contact.emailAllowed==='boolean' &&
    typeof contact.queueStatus==='string' && typeof contact.lastTouch==='string'){
  Object.assign(sam,{callAllowed:contact.callAllowed,emailAllowed:contact.emailAllowed,queueStatus:contact.queueStatus,lastTouch:contact.lastTouch});
  return;
 }
 // Early session snapshots have the native call events but no saved contact projection.
 const calls=saved.rows.calls.filter(call=>call.contactId===sam.id && call.status==='Logged');
 if(!calls.length)return;
 const latest=calls.reduce((a,b)=>a.endedAt>b.endedAt?a:b);
 sam.lastTouch=latest.outcome;
 if(calls.some(call=>call.outcome==='Do not contact')){
  Object.assign(sam,{callAllowed:false,emailAllowed:false,queueStatus:'Excluded'});
 }else if(calls.some(call=>call.outcome==='Wrong number')){
  Object.assign(sam,{callAllowed:false,queueStatus:'Needs phone correction'});
 }else if(sam.callAllowed)sam.queueStatus='Attempted';
}

// Called only when creating a fresh seeded dataset, before any user-created ids exist.
export function restoreFollowupCase(d){
 let saved;
 try{saved=JSON.parse(sessionStorage.getItem(followupSessionPrefix+d.id));}catch{return d;}
 const c=saved?.caseData;
 if(c?.id!=='followup' || !Number.isInteger(c.stage) || c.stage<0 || c.stage>3 ||
    !Array.isArray(c.history) || !Number.isSafeInteger(saved.nextSalesId))return d;
 const collections=['salesTasks','calls','callJobs','emailOutbox','outreach','salesActivity','activity'];
 if(!collections.every(key=>Array.isArray(saved.rows?.[key]) && saved.rows[key].every(row=>row && typeof row==='object')))return d;
 for(const key of collections)d[key].unshift(...saved.rows[key]);
 restoreFollowupContact(d,saved);
 d.nextSalesId=Math.max(d.nextSalesId,saved.nextSalesId);
 ensureOutcomes(d).cases.followup=c;
 return d;
}
