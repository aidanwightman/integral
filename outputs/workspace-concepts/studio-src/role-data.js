import {initializeCollections} from './collections-model.js';
import {extendDepthData} from './depth-data.js';
import {extendCallingData} from './calling.js';
export const REVIEW_WEEKS=['2026-11-16','2026-11-23','2026-11-30'];
export function extendRoleData(d){
 const p=d.id+'-',teams=['Growth sales','Growth sales','Enterprise sales','Enterprise sales','Delivery','Delivery','Customer service','Customer service'];
 d.team.forEach((t,i)=>Object.assign(t,{department:teams[i],tenureMonths:[22,5,31,11,18,8,27,4][i],leaveBalanceHours:112+i*8,manager:i<4?'Commercial director':'Operations director'}));
 d.opportunities.forEach((o,i)=>Object.assign(o,{owner:d.team[(i+Math.floor(i/4))%4].name,daysInStage:3+(i*7)%40,nextStepDue:i%5===0?'2026-11-12':'2026-11-20',forecastCategory:o.probability===1?'Closed':o.probability>=.7?'Commit':o.probability>=.45?'Best case':'Pipeline'}));
 d.leave=[{person:0,start:'2026-11-17',end:'2026-11-18',status:'Approved'},{person:1,start:'2026-11-18',end:'2026-11-20',status:'Pending'},{person:2,start:'2026-11-23',end:'2026-11-25',status:'Approved'},{person:4,start:'2026-11-19',end:'2026-11-20',status:'Pending'},{person:5,start:'2026-11-19',end:'2026-11-20',status:'Approved'},{person:6,start:'2026-11-30',end:'2026-12-02',status:'Pending'}].map((x,i)=>({id:p+'leave'+i,personId:d.team[x.person].id,start:x.start,end:x.end,status:x.status,type:'Annual leave',requestedAt:'2026-11-12',decisionBy:x.status==='Approved'?'Demo manager':null}));
 d.lifecycle=[{id:p+'life0',personId:d.team[7].id,kind:'Onboarding',task:'Confirm equipment and system access',due:'2026-11-18',status:'Open',owner:'Operations director'},{id:p+'life1',personId:d.team[1].id,kind:'Development',task:'Schedule 30-day coaching check-in',due:'2026-11-20',status:'Open',owner:'Commercial director'},{id:p+'life2',personId:d.team[5].id,kind:'Training',task:'Confirm service training completion',due:'2026-11-23',status:'Open',owner:'Operations director'}];
 d.automations=[
  {id:p+'auto0',name:'New enquiry follow-up',ownerId:d.team[0].id,trigger:'New qualified enquiry',status:'Active',steps:['Check contact eligibility and existing enrolment','Send a relevant introduction','Wait 2 business days','Create an owner call task','Stop on reply, meeting or opt-out'],schedule:'Weekdays · 09:00–17:00 · Europe/London',version:3},
  {id:p+'auto1',name:'Proposal follow-through',ownerId:d.team[2].id,trigger:'Proposal sent and no reply',status:'Active',steps:['Check open opportunity and consent policy','Wait 3 business days','Send a contextual follow-up','Create a review task after 5 days','Stop when won, replied or opted out'],schedule:'Weekdays · 10:00–16:00 · Europe/London',version:2},
  {id:p+'auto2',name:'Renewal conversation',ownerId:d.team[3].id,trigger:'Contract renewal in 60 days',status:'Paused',steps:['Check renewal date and account owner','Create renewal review task','Draft personal outreach for approval','Stop on reply or completed renewal'],schedule:'Weekdays · 09:00–17:00 · Europe/London',version:1}
 ];
 d.outreach=[];
 const base=[55,48,40,35],rates=[5,9,4,7];
 for(let owner=0;owner<4;owner++)for(let week=0;week<3;week++)for(let j=0;j<base[owner]+week*3;j++){
  const status=j%23===0?'Suppressed':j%19===0?'Failed':'Sent';const replied=status==='Sent'&&j%rates[owner]===0;
  d.outreach.push({id:p+`msg-${owner}-${week}-${j}`,ownerId:d.team[owner].id,accountId:d.accounts[j%12].id,automationId:j%3?d.automations[owner%2].id:null,week:REVIEW_WEEKS[week],source:j%3===0?'Inbound':'Outbound',segment:j%2?'Growth':'Enterprise',status,replied,meeting:replied&&j%2===0,personalised:owner%2===0?j%4!==0:j%4===0,reason:status==='Suppressed'?'Opted out':status==='Failed'?'Mailbox rejected delivery':'Delivered',responseHours:replied?2+(j+owner*3)%26:null});
 }
 d.salesResults=Array.from({length:40},(_,i)=>({id:p+'result'+i,ownerId:d.team[i%4].id,accountId:d.accounts[i%12].id,week:REVIEW_WEEKS[Math.floor(i/4)%3],source:i%3===0?'Inbound':'Outbound',segment:i%2?'Growth':'Enterprise',outcome:i%7<3?'Won':'Lost',valuePence:Math.round(d.monthlyCostPence*(.25+i%5*.1)),cycleDays:18+(i*7)%48,reason:i%7<3?'Clear next step agreed':i%3===0?'Timing':i%3===1?'Scope fit':'Budget'}));
 d.enrolments=Array.from({length:9},(_,i)=>({id:p+'enrol'+i,automationId:d.automations[i%3].id,accountId:d.accounts[i].id,ownerId:d.team[i%4].id,state:['Eligible','Replied','Opted out','Eligible','Duplicate','Eligible','Eligible','Meeting booked','Eligible'][i],processed:false}));
 d.runLog=[];
 d.bills=Array.from({length:6},(_,i)=>({id:p+'bill'+i,supplier:['Cloud services','Venue partner','Equipment supplier','Design contractor','Travel provider','Service partner'][i],amountPence:Math.round(d.monthlyCostPence*(.06+i*.02)),due:['2026-11-18','2026-11-20','2026-11-23','2026-11-25','2026-11-27','2026-11-30'][i],status:i%3===0?'Approved':'Needs review',category:['Technology','Delivery','Equipment'][i%3]}));
 d.risks=[{id:p+'risk0',team:'Delivery',title:'Supplier handoff needs confirmation',impact:'Milestone at risk',owner:d.team[4].name,status:'Open'},{id:p+'risk1',team:'Growth sales',title:'Next steps missing on ageing opportunities',impact:'Forecast confidence',owner:d.team[0].name,status:'Open'},{id:p+'risk2',team:'Customer service',title:'Coverage review for upcoming leave',impact:'Response capacity',owner:d.team[6].name,status:'Open'}];
 return extendDepthData(extendCallingData(initializeCollections(d)));
}
