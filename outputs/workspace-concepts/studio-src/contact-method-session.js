// In this tab, retain edits to contact methods separately from the follow-up simulation.
const contactMethodSessions = new WeakMap();
const contactMethodKey = industry => 'integral-contact-methods-v1/' + industry;
const persistedMethodFields = ['email','phone','suggestedEmail','emailStatus','emailEvidence','methodEvidence'];
const contactIdentityFields = ['id','accountId','ownerId','name','firstName','lastName','title','timezone','need','source','emailAllowed','callAllowed','queueStatus','lastTouch','exampleRecord'];
const projectContactFields = (record, keys) => Object.fromEntries(keys.filter(key=>Object.hasOwn(record,key)).map(key=>[key,record[key]]));

export function restoreContactMethods(d) {
  if (contactMethodSessions.has(d)) return d;
  const initial = new Map(d.contacts.map(contact=>[contact.id,JSON.stringify(projectContactFields(contact,persistedMethodFields))]));
  const session = {initial,accounts:new Set(d.accounts.map(a=>a.id)),last:''};
  contactMethodSessions.set(d,session);
  let saved;
  try { saved=JSON.parse(sessionStorage.getItem(contactMethodKey(d.id))); } catch { return d; }
  if (saved?.industry!==d.id || !Number.isSafeInteger(saved.nextSalesId) || !Array.isArray(saved.contacts)) return d;
  session.last=JSON.stringify(saved);
  const companies=Array.isArray(saved.emailCompanies)?saved.emailCompanies:[];
  for(const company of companies) {
    if(typeof company?.id==='string' && company.id.startsWith(d.id+'-company-') && company.name && !d.accounts.some(a=>a.id===company.id)) d.accounts.push(company);
  }
  for (const row of saved.contacts) {
    if (!row || typeof row.id!=='string' || !row.id.startsWith(d.id+'-') || !row.methods || typeof row.methods!=='object') continue;
    let contact=d.contacts.find(item=>item.id===row.id);
    if (!contact) {
      const identity=row.identity;
      if (identity?.id!==row.id || !identity.name || !d.team.some(person=>person.id===identity.ownerId)) continue;
      if (!d.accounts.some(a=>a.id===identity.accountId)) {
        if (row.company?.id!==identity.accountId || !row.company.name) continue;
        d.accounts.push(row.company);
      }
      contact=projectContactFields(identity,contactIdentityFields);
      d.contacts.push(contact);
    }
    for (const field of persistedMethodFields) {
      if (Object.hasOwn(row.methods,field)) contact[field]=row.methods[field];
      else delete contact[field];
    }
  }
  for (const key of ['activity','salesActivity']) {
    if (!Array.isArray(saved[key])) continue;
    const rows=saved[key].filter(event=>event && ['email','phone'].includes(event.contactMethod) &&
      d.contacts.some(contact=>contact.id===event.recordId) && !d[key].some(existing=>existing.id===event.id));
    d[key].unshift(...rows);
  }
  for (const message of Array.isArray(saved.crmEmails)?saved.crmEmails:[]) {
    const contact=d.contacts.find(person=>person.id===message?.contactId);
    if (!contact || !d.accounts.some(a=>a.id===message.accountId) || typeof message.id!=='string' || !message.id.startsWith(d.id+'-') ||
      !['Incoming','Outgoing'].includes(message.direction) || typeof message.body!=='string' || !Number.isFinite(Date.parse(message.at))) continue;
    const messages=(d.crmEmails ||= []);
    if (!messages.some(m=>m.id===message.id)) messages.push(message);
  }
  d.nextSalesId=Math.max(d.nextSalesId,saved.nextSalesId);
  return d;
}

export function persistContactMethods(d) {
  const session=contactMethodSessions.get(d);
  if (!session) return;
  const contacts=[];
  for (const contact of d.contacts) {
    const methods=projectContactFields(contact,persistedMethodFields);
    if (JSON.stringify(methods)===session.initial.get(contact.id)) continue;
    const row={id:contact.id,methods};
    if (!session.initial.has(contact.id)) {
      row.identity=projectContactFields(contact,contactIdentityFields);
      if (!session.accounts.has(contact.accountId)) row.company=d.accounts.find(a=>a.id===contact.accountId);
    }
    contacts.push(row);
  }
  if (!contacts.length && !d.crmEmails?.length && !session.last) return;
  const tagged=event=>['email','phone'].includes(event.contactMethod);
  const emailCompanies=d.accounts.filter(a=>!session.accounts.has(a.id) && d.crmEmails?.some(m=>m.accountId===a.id));
  const data=JSON.stringify({industry:d.id,contacts,nextSalesId:d.nextSalesId,crmEmails:d.crmEmails || [],
    emailCompanies,activity:d.activity.filter(tagged),salesActivity:d.salesActivity.filter(tagged)});
  if (session.last===data) return;
  try {sessionStorage.setItem(contactMethodKey(d.id),data);session.last=data;} catch {}
}
