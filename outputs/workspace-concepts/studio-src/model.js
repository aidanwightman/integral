import {PIPELINE_DAY,pipelineGateReason,pipelineAudit} from './pipeline-invitations.js';
export function sum(rows,key){return rows.reduce((n,r)=>n+(typeof key==='function'?key(r):r[key]||0),0);}
export function balance(invoice){return Math.max(0,invoice.totalPence-invoice.paidPence);}
export function metrics(data){const open=data.opportunities.filter(d=>d.probability<1);return {pipeline:sum(open,'valuePence'),weighted:Math.round(sum(open,d=>d.valuePence*d.probability)),won:sum(data.opportunities.filter(d=>d.probability===1),'valuePence'),receivables:sum(data.invoices,balance),overdue:sum(data.invoices.filter(i=>i.overdueDays>0),balance),active:data.work.filter(w=>w.status!=='Complete').length,capacity:sum(data.team,'capacity'),allocated:sum(data.team,'allocated'),cash:data.openingCashPence};}
export function cashForecast(data,{delay=0,costChange=0,pipeline=false,conversion=100}={}){
  let cash=data.openingCashPence;
  return Array.from({length:6},(_,i)=>{const month=i+1;
    const receipts=sum(data.invoices.filter(v=>v.dueMonth+delay===month),balance);
    const potential=pipeline?Math.round(sum(data.opportunities.filter(v=>v.probability<1&&v.closeMonth+delay===month),v=>v.valuePence*Math.min(1,v.probability*conversion/100))):0;
    const costs=Math.round(data.monthlyCostPence*(1+costChange/100));
    cash+=receipts+potential-costs;return {month,receipts,potential,costs,cash};
  });
}
export function relationships(data,accountId,role){const account=data.accounts.find(a=>a.id===accountId)||data.accounts[0];const nodes=[{id:account.id,type:'account',label:account.name,record:account}];const append=(rows,type,label)=>rows.forEach(r=>nodes.push({id:r.id,type,label:label(r),record:r}));
  if(role==='finance')append(data.invoices.filter(r=>r.accountId===account.id),'invoice',r=>r.number);
  else if((role==='sales'||role==='saleslead'))append(data.opportunities.filter(r=>r.accountId===account.id),'opportunity',r=>r.name.split(' · ')[1]);
  else if(role==='people')append(data.work.filter(r=>r.accountId===account.id),'work',r=>r.title);
  else {append(data.domain.filter(r=>r.accountId===account.id),'domain',r=>r.name);append(data.work.filter(r=>r.accountId===account.id),'work',r=>r.title);if(role==='leadership')append(data.invoices.filter(r=>r.accountId===account.id),'invoice',r=>r.number);}
  const edges=nodes.slice(1).map(n=>({from:account.id,to:n.id,label:({invoice:'has invoice',opportunity:'opportunity',work:'delivered for',domain:'linked record'})[n.type]}));
  const linkedOwners=new Set(nodes.filter(n=>n.type==='work'||n.type==='opportunity').map(n=>n.record.owner));
  linkedOwners.forEach(name=>{const t=data.team.find(t=>t.name===name);if(!t)return;nodes.push({id:t.id,type:'person',label:t.name,record:t});nodes.filter(n=>['work','opportunity'].includes(n.type)&&n.record.owner===name).forEach(n=>edges.push({from:n.id,to:t.id,label:'owned by'}));});
  return {account,nodes,edges,domainLabel:data.config.singular};
}
export function recordsFor(data,role){if(role==='finance')return data.invoices;if((role==='sales'||role==='saleslead'))return data.opportunities;if(role==='operations')return data.work;if(role==='people')return data.team;return data.domain;}
export function moveStage(data,id,expectedStage,actor,today=PIPELINE_DAY){
  const record=data.opportunities.find(o=>o.id===id);
  if(!record)throw new Error('Opportunity not found.');
  if(expectedStage && record.stage!==expectedStage){
    if(record.lastTransition?.from===expectedStage && record.lastTransition.to===record.stage)return record;
    throw new Error('The stage has changed. Reopen the record before moving it.');
  }
  const stages=data.config.stages, index=stages.indexOf(record.stage), next=index+1;
  if(index<0 || !stages[next])throw new Error('No next stage is available.');
  const reason=pipelineGateReason(data,record,next,today);
  if(reason){
    if(record.heldStage?.to!==stages[next] || record.heldStage.reason!==reason){
      record.heldStage={to:stages[next],reason};
      pipelineAudit(data,record,'Stage held',stages[next]+' · '+reason,actor);
    }
    throw new Error(reason);
  }
  record.lastTransition={from:record.stage,to:stages[next]};
  delete record.heldStage;
  record.stage=stages[next];record.probability=[.2,.45,.7,1][next];record.daysInStage=0;
  record.nextStepDue=today;
  record.forecastCategory=['Pipeline','Best case','Commit','Closed'][next];
  record.next=['Confirm requirements','Review the proposal','Agree the next step','Arrange handover'][next];
  pipelineAudit(data,record,'Stage changed',record.lastTransition.from+' → '+record.stage,actor);
  return record;
}
export const dealHandoffRoles={sales:'Sales',saleslead:'Sales leadership',leadership:'Company leadership'};

export function handoffOpportunity(data,id,role,values,version,fromOwner) {
  if(!Object.hasOwn(dealHandoffRoles,role)) throw new Error('Only the sales team or company leadership can change the deal owner.');
  const deal=data.opportunities.find(o=>o.id===id);
  if(!deal) throw new Error('Opportunity not found.');
  const history=deal.ownerHistory || [];
  if(String(version)!==String(history.length) || deal.owner!==fromOwner) throw new Error('The deal owner changed. Reopen the record before handing it over.');
  const from=data.team.find(t=>t.name===deal.owner);
  const to=data.team.find(t=>t.id===values.ownerId && t.department.includes('sales'));
  if(!from || !to || from.id===to.id) throw new Error('Choose a different sales colleague.');
  const note=String(values.reason || '').trim();
  if(!note || note.length>1600) throw new Error('Enter a handoff note of up to 1,600 characters.');
  const at=new Date().toISOString();
  const change={revision:history.length+1,fromId:from.id,toId:to.id,from:from.name,to:to.name,role,note,at};
  deal.owner=to.name;
  deal.ownerHistory=[...history,change];
  data.activity.unshift({action:'Deal owner changed',accountId:deal.accountId,opportunityId:id,recordId:id,actor:dealHandoffRoles[role],
    detail:from.name+' → '+to.name+' · '+dealHandoffRoles[role]+' · '+note,at});
  return deal;
}

export function reallocate(data,id,newOwner){const work=data.work.find(w=>w.id===id);if(!work||!data.team.some(t=>t.name===newOwner))throw new Error('Choose a valid work item and owner');work.owner=newOwner;data.team.forEach(t=>t.allocated=sum(data.work.filter(w=>w.owner===t.name&&w.status!=='Complete'),'hours'));data.activity.unshift({action:'Work reassigned',recordId:id,owner:newOwner});}
