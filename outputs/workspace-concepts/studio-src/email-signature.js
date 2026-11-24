import {normalizedContactMethod} from './contact-evidence.js';

// Consider labelled numbers below the sender's own name. Stop at quoted mail.
export function signaturePhoneCandidate(message,contact){
  if(message?.direction!=='Incoming'||message.contactId!==contact.id||message.accountId!==contact.accountId)return null;
  const received=Date.parse(message.at);
  if(!Number.isFinite(received)||received>Date.now())return null;
  const lines=String(message.body||'').split(/\r?\n/).map(line=>line.trim());
  const quoted=lines.findIndex(line=>/^(?:>|On .+wrote:|From:\s|[-_ ]*(?:Original Message|Forwarded message)[-_ ]*$)/i.test(line));
  const tail=(quoted<0?lines:lines.slice(0,quoted)).filter(Boolean).slice(-9);
  const nameIndex=tail.findLastIndex(line=>line.toLowerCase()===contact.name.trim().toLowerCase());
  if(nameIndex<0)return null;
  const numbers=new Map();
  for(const line of tail.slice(nameIndex+1)){
    const match=line.match(/^(?:direct(?: line)?|mobile|tel(?:ephone)?|phone)\s*:\s*(\+?[\d(][\d ().-]*(?:(?:ext\.?|x)\s*\d+)?)$/i);
    if(!match)continue;
    const normalized=normalizedContactMethod('phone',match[1]);
    if(/^\+?\d{7,16}(?:x\d+)?$/.test(normalized))numbers.set(normalized,match[1]);
  }
  if(numbers.size!==1)return null;
  const [normalized,value]=numbers.entries().next().value;
  return {value,matchesSaved:normalized===normalizedContactMethod('phone',contact.phone)};
}
