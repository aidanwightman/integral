import {crmSaveContact,crmReviewContact,crmLogInbound,crmRecordMethodCheck} from './contact-model.js';

// Build this example only when its link is opened. A saved example always wins,
// including edits to its name, addresses, phone, or evidence.
export function contactChecksExample(d) {
  const existing=d.contacts.find(person=>person.exampleRecord==='contact-checks');
  if(existing)return existing;
  let fields,messageId;
  for(let n=1;;n++){
    const company=n===1?'Linden Quay Studio':'Linden Quay Studio (example '+n+')';
    const domain=n===1?'lindenquay.example':'lindenquay-'+n+'.example';
    if(d.accounts.some(account=>account.name?.trim().toLowerCase()===company.toLowerCase() || account.domain?.toLowerCase()===domain))continue;
    const email='elena.ward@'+domain;
    messageId='contact-checks-'+n+'@'+domain;
    if(d.crmEmails?.some(message=>message.messageId===messageId || message.address?.toLowerCase()===email))continue;
    fields={firstName:'Elena',lastName:'Ward',title:'Studio manager',source:'Contact checks example',accountId:'new',
      company,domain,region:'UK',ownerId:d.team[0].id,email,phone:'+44 1632 960105'+(n>1?' ext '+n:''),
      timezone:'Europe/London',emailAllowed:true,callAllowed:true,need:'Confirm the workshop schedule and share the revised brief.'};
    if(!crmReviewContact(d,fields).matches.length)break;
  }
  const person=crmSaveContact(d,fields);
  person.exampleRecord='contact-checks';
  const today=new Date();
  function exampleAt(daysAgo,hour,minute){
    return new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-daysAgo,hour,minute)).toISOString();
  }
  const received=exampleAt(8,9,15);
  crmLogInbound(d,{sender:person.email,received,messageId,subject:'Please use this email for the workshop',
    body:'Hello,\n\nPlease send the revised workshop brief to '+person.email+'. I check this inbox daily.\n\nElena Ward\nStudio manager'});
  const source=d.crmEmails.find(message=>message.contactId===person.id && message.messageId===messageId);
  crmRecordMethodCheck(d,person.id,{method:'email',value:person.email,result:'verified',checkedAt:exampleAt(8,9,40),
    source:'Incoming email',sourceMessageId:source.id,evidence:'Elena named this address in her reply and asked us to send the revised brief here.'});
  crmRecordMethodCheck(d,person.id,{method:'phone',value:person.phone,result:'verified',checkedAt:exampleAt(5,11,20),
    source:'Workshop contact sheet',evidence:'Elena supplied this direct line on the signed workshop brief. It matches the number on her contact sheet.'});
  crmRecordMethodCheck(d,person.id,{method:'phone',value:person.phone,result:'unconfirmed',checkedAt:exampleAt(1,14,5),
    source:'Company directory',evidence:'The current directory lists reception only. It did not confirm Elena’s direct line.'});
  return person;
}
