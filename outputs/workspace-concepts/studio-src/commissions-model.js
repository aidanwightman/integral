/* Synthetic November plan. Integer pence; approvals never create payments. */
export function ensureCommissions(d){
 if(!d.commissions)d.commissions={revision:1,plans:[
  {id:'core',name:'Core',rate:5,bonusPence:10000,thresholdPence:500000},
  {id:'growth',name:'Growth',rate:8,bonusPence:25000,thresholdPence:1000000},
  {id:'enterprise',name:'Enterprise',rate:10,bonusPence:50000,thresholdPence:2000000}],
 teams:[{id:'direct',name:'Direct sales',maxDiscount:15,repShare:100},{id:'partner',name:'Partner sales',maxDiscount:10,repShare:70}],
 deals:[{id:'CM-101',account:d.accounts[0]?.name||'Northstar',owner:'Alex Morgan',package:'growth',team:'direct',grossPence:1200000,discount:10,cashPence:1080000,refundPence:0,approved:false},{id:'CM-102',account:d.accounts[1]?.name||'Forma',owner:'Robin Chen',package:'enterprise',team:'partner',grossPence:2500000,discount:20,cashPence:2000000,refundPence:0,approved:false,inquiries:[{number:1,reason:'Credit split',note:'The referral agreement names a second partner. Check the credited share.',reference:'Partner schedule PS-102',raisedBy:'saleslead',openedAt:'2026-11-19T14:30:00Z',status:'Open',planRevision:1,originalRepPence:175000}]},{id:'CM-103',account:d.accounts[2]?.name||'Orbit',owner:'Casey Taylor',package:'core',team:'direct',grossPence:800000,discount:0,cashPence:400000,refundPence:0,approved:false}],history:[]};
 for(const deal of d.commissions.deals){
   if(!deal.accountId)deal.accountId=d.accounts.find(account=>account.name===deal.account)?.id;
 }
 return d.commissions;
}
function projectedCommission(plan,value){
 const base=Math.round(value*plan.rate/100);
 const bonus=value>=plan.thresholdPence?plan.bonusPence:0;
 return {base,bonus,total:base+bonus};
}
export function openCommissionForecast(d,{month=0,owner=''}={}){
 const c=ensureCommissions(d), selectedMonth=Number(month);
 const rows=d.opportunities.filter(o=>o.probability<1 && (!selectedMonth || o.closeMonth===selectedMonth) && (!owner || o.owner===owner)).map(o=>{
   const plan=c.plans.find(p=>p.id===o.commissionPlanId);
   const projected=plan?projectedCommission(plan,o.valuePence).total:null;
   return {opportunity:o,plan,projected,weighted:plan?Math.round(projected*o.probability):null};
 });
 return {rows,weighted:rows.reduce((total,r)=>total+(r.weighted||0),0),unassigned:rows.filter(r=>!r.plan).length};
}
export function commissionCalculation(c,deal){
 const plan=c.plans.find(p=>p.id===deal.package),team=c.teams.find(t=>t.id===deal.team);
 const net=deal.grossPence-Math.round(deal.grossPence*deal.discount/100),retained=Math.max(0,net-deal.refundPence);
 const {base,bonus,total}=projectedCommission(plan,retained);
 const repShare=deal.repShareOverride ?? team.repShare;
 const rep=Math.round(total*repShare/100),partner=total-rep;
 const holds=[];if(deal.discount>team.maxDiscount)holds.push(`Discount exceeds ${team.maxDiscount}% team limit`);if(deal.cashPence<net)holds.push('Customer payment incomplete');if(deal.refundPence>0 && deal.reviewedRefundPence!==deal.refundPence)holds.push('Refund requires adjustment review');if(net===0)holds.push('No commissionable revenue');
 if(deal.inquiries?.some(item=>item.status==='Open'))holds.push('Commission inquiry awaiting Finance');
 return {plan,team,net,retained,base,bonus,total,rep,partner,holds,eligible:holds.length===0};
}
function cmNumber(value,label,min,max,integer=false){const n=Number(value);if(!['string','number'].includes(typeof value)||String(value).trim()===''||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error(`${label}: enter ${min}–${max}${integer?' as a whole number':''}.`);return n;}
function cmMoney(value,label){const n=cmNumber(value,label,0,10000000);if(Math.abs(n*100-Math.round(n*100))>0.000001)throw Error(`${label}: use no more than two decimal places.`);return Math.round(n*100);}
function clearCommissionApproval(deal){deal.approved=false;delete deal.approvedRevision;delete deal.approvedPence;}
export const COMMISSION_ISSUES=['Credit split','Refund adjustment','Missing or incorrect commission'];
export function commissionAlerts(d,role){
 if(role!=='finance')return [];
 return ensureCommissions(d).deals.flatMap(deal=>(deal.inquiries||[]).filter(item=>item.status==='Open').map(item=>({
   id:'cm-'+deal.id+'-'+item.number,commissionId:deal.id,title:'Investigate commission',detail:deal.account+' · '+item.reason+' · '+item.reference,
   owner:'Finance',severity:'warning',revision:item.number
 })));
}
function reviewCommission(c,deal,action,input,role){
 if(!deal)throw Error('Select a commission line.');
 const note=String(input.note||'').trim();
 const reference=String(input.reference||'').trim();
 if(!note || !reference)throw Error('Add an evidence reference and a note.');
 const line=commissionCalculation(c,deal);
 const inquiry=deal.inquiries?.find(item=>item.status==='Open');
 if(action==='commission-query'){
   if(!['sales','saleslead','leadership'].includes(role))throw Error('Open the inquiry from a commercial workspace.');
   if(inquiry)throw Error('Finance already has an open inquiry for this line.');
   if(!COMMISSION_ISSUES.includes(input.reason))throw Error('Choose the reason for the inquiry.');
   const items=deal.inquiries ||= [];
   items.push({number:items.length+1,reason:input.reason,note,reference,raisedBy:role,openedAt:new Date().toISOString(),status:'Open',planRevision:c.revision,originalRepPence:line.rep});
   return deal.id+' referred to Finance.';
 }
 if(role!=='finance')throw Error('Finance must review the supporting evidence.');
 if(action==='commission-refund-review'){
   if(!deal.refundPence || deal.reviewedRefundPence===deal.refundPence)throw Error('There is no unreviewed refund.');
   deal.reviewedRefundPence=deal.refundPence;
   return deal.id+' refund of '+(deal.refundPence/100).toFixed(2)+' GBP verified against '+reference+'. '+note;
 }
 if(!inquiry || String(inquiry.number)!==String(input.number))throw Error('This inquiry has changed. Reopen the statement.');
 if(input.decision==='Correct split'){
   if(inquiry.reason!=='Credit split')throw Error('A split correction requires a credit-split inquiry.');
   deal.repShareOverride=cmNumber(input.split,'Corrected rep share',0,100);
 }else if(input.decision!=='Confirm calculation')throw Error('Choose a decision.');
 Object.assign(inquiry,{status:'Resolved',decision:input.decision,decisionNote:note,decisionReference:reference,resolvedAt:new Date().toISOString(),
   resolvedBy:role,reviewedRepPence:commissionCalculation(c,deal).rep});
 return deal.id+' inquiry resolved by Finance. '+input.decision+' · '+reference;
}
export function commissionAction(d,action,id,input={},role='finance'){
 const c=ensureCommissions({accounts:d.accounts,commissions:d.commissions?structuredClone(d.commissions):null}),deal=c.deals.find(x=>x.id===id);let message='';
 const before=deal && commissionCalculation(c,deal);
 const version=deal?.version||0;
 if(deal && input.expected!==undefined && input.expected!==c.revision+'-'+version)
   throw Error('The commission changed. Review the current line before submitting.');
 if(['commission-query','commission-resolve','commission-refund-review'].includes(action)){
  message=reviewCommission(c,deal,action,input,role);clearCommissionApproval(deal);
 }else if(action==='commission-source'){
  if(role!=='finance' || !deal)throw Error('Finance must verify the source for this commission line.');
  const reference=String(input.reference||'').trim();
  if(!reference)throw Error('Enter the source document or transaction reference.');
  const source=d.opportunities.find(o=>o.id===input.opportunity && deal.accountId && o.accountId===deal.accountId);
  if(!source)throw Error('Choose a deal for the same customer as the commission line.');
  if(deal.source?.opportunityId===source.id && deal.source.reference===reference)return 'This source is already recorded.';
  deal.source={opportunityId:source.id,reference,valuePence:source.valuePence};
  clearCommissionApproval(deal);
  message=`Source verified against ${source.name} (${source.id}) · ${reference}`;
 }else if(!['finance','saleslead','leadership'].includes(role)){
  throw Error('Open a commission inquiry for Finance to review.');
 }else if(action==='commission-new-package'){
  if(!['finance','leadership'].includes(role))throw Error('Finance or Company leadership manages packages.');
  const name=String(input.name||'').trim();
  if(!name || name.length>60)throw Error('Enter a package name of up to 60 characters.');
  if(c.plans.some(plan=>plan.name.toLowerCase()===name.toLowerCase()))throw Error('A commission package already uses that name.');
  const plan={id:'custom-'+(c.plans.length+1),name,rate:cmNumber(input.rate,'Commission rate',0,100),bonusPence:cmMoney(input.bonus,'Deal bonus'),thresholdPence:cmMoney(input.threshold,'Bonus threshold')};
  c.plans.push(plan);message='Commission package added: '+name+'.';
 }else if(action==='commission-assign-package'){
  if(!['finance','leadership'].includes(role))throw Error('Finance or Company leadership assigns packages.');
  const opportunity=d.opportunities.find(o=>o.id===id);
  if(!opportunity || opportunity.probability>=1)throw Error('Select an open opportunity.');
  if((opportunity.commissionPlanId||'')!==input.previous)throw Error('The assignment changed. Reopen the forecast.');
  const plan=c.plans.find(p=>p.id===input.package);
  if(!plan && input.package!=='')throw Error('Select an available commission package.');
  if(input.package===input.previous)return 'This package is already assigned.';
  const previous=c.plans.find(p=>p.id===opportunity.commissionPlanId)?.name || 'Unassigned';
  opportunity.commissionPlanId=input.package || null;
  message=opportunity.name+' · '+previous+' → '+(plan?.name||'Unassigned');
  d.activity.unshift({action:'Commission package changed',recordId:id,accountId:opportunity.accountId,opportunityId:id,actor:role,detail:message,at:new Date().toISOString()});
 }else if(action==='commission-save'){
  if(!deal)throw Error('Select a deal.');
  if(!c.plans.some(p=>p.id===input.package)||!c.teams.some(t=>t.id===input.team))throw Error('Choose a valid package and team.');
  const grossPence=cmMoney(input.gross,'List price'),discount=cmNumber(input.discount,'Discount',0,100),cashPence=cmMoney(input.cash,'Cash received'),refundPence=cmMoney(input.refund,'Refund');
  const net=grossPence-Math.round(grossPence*discount/100);
  if(cashPence>net)throw Error('Cash received cannot exceed the discounted price.');if(refundPence>cashPence)throw Error('Refund cannot exceed cash received.');
  if(deal.package===input.package && deal.team===input.team && deal.grossPence===grossPence && deal.discount===discount && deal.cashPence===cashPence && deal.refundPence===refundPence)return 'The commission inputs are unchanged.';
  if(refundPence!==deal.refundPence || grossPence!==deal.grossPence || cashPence!==deal.cashPence || discount!==deal.discount)delete deal.reviewedRefundPence;
  if(input.team!==deal.team)delete deal.repShareOverride;
  Object.assign(deal,{package:input.package,team:input.team,grossPence,discount,cashPence,refundPence,approved:false});clearCommissionApproval(deal);message=`${id} updated. Previous approval cleared; calculation refreshed.`;
 }else if(action==='commission-approve'){
  if(!deal)throw Error('Select a deal.');const result=commissionCalculation(c,deal);if(!result.eligible)throw Error(result.holds.join('. ')+'.');if(deal.approved)throw Error('Already approved.');deal.approved=true;deal.approvedRevision=c.revision;deal.approvedPence=result.total;message=`${id} approved for payroll review. No payment made.`;
 }else if(action==='commission-reopen'){
  if(!deal||!deal.approved)throw Error('Select an approved deal.');
  if(!String(input.note||'').trim())throw Error('Give a reason for reopening this approval.');
  clearCommissionApproval(deal);message=`${id} returned to review.`;
 }else if(action==='commission-plan'||action==='commission-team'){
  if(action==='commission-plan'){
   const plan=c.plans.find(p=>p.id===id);if(!plan)throw Error('Choose a valid package.');
   const rate=cmNumber(input.rate,'Commission rate',0,100),bonusPence=cmMoney(input.bonus,'Deal bonus'),thresholdPence=cmMoney(input.threshold,'Bonus threshold');
   if(plan.rate===rate && plan.bonusPence===bonusPence && plan.thresholdPence===thresholdPence)return 'The package rule is unchanged.';
   Object.assign(plan,{rate,bonusPence,thresholdPence});
  }else{
   const team=c.teams.find(t=>t.id===id);if(!team)throw Error('Choose a valid team.');
   const maxDiscount=cmNumber(input.maxDiscount,'Discount limit',0,100),repShare=cmNumber(input.repShare,'Rep share',0,100);
   if(team.maxDiscount===maxDiscount && team.repShare===repShare)return 'The team rule is unchanged.';
   Object.assign(team,{maxDiscount,repShare});
  }
  c.revision++;for(const row of c.deals)clearCommissionApproval(row);message=`Plan revision ${c.revision} saved. All approvals cleared for recalculation.`;
 }else throw Error('Unknown commission action.');
 const entry={action:message,kind:action,actor:role,revision:c.revision,at:new Date().toISOString()};
 if(deal){
  const after=commissionCalculation(c,deal);
  deal.version=version+1;
  Object.assign(entry,{lineId:deal.id,repBefore:before.rep,repAfter:after.rep,totalPence:after.total,
    status:deal.approved?'Approved for payroll review':after.eligible?'Ready for approval':'On hold',
    reason:after.holds.join(' · '),reference:String(input.reference||'').trim(),note:String(input.note||'').trim()});
 }else if(action==='commission-plan'||action==='commission-team'){
  entry.clearedLines=(d.commissions?.deals||[]).filter(row=>row.approved).map(row=>row.id);
 }
 c.history.unshift(entry);d.commissions=c;return message;
}
