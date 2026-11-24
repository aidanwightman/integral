export function normalizedContactMethod(method, value) {
  const text = String(value ?? '').trim();
  if (method === 'email') return text.toLowerCase();
  if (method !== 'phone') throw new Error('Choose email or phone.');
  return text.toLowerCase().replace(/(?:extension|ext\.?|x|#)\s*(\d+)$/, 'x$1')
    .replace(/[\s().-]/g, '').replace(/^00/, '+');
}

export function contactMethodChanged(contact, method, nextValue) {
  const prior = normalizedContactMethod(method, contact[method]);
  const value = normalizedContactMethod(method, nextValue);
  if (prior === value || (!prior && !contact.methodEvidence?.[method])) return;
  (contact.methodEvidence ||= {})[method] = {value, changedAt:new Date().toISOString()};
}

function datedContactCheck(item) {
  if (!item?.source || !item.evidence || !['verified','unconfirmed'].includes(item.result)) return null;
  return typeof item.at === 'string' && Number.isFinite(Date.parse(item.at)) ? item : null;
}

function legacyContactCheck(contact, method, value) {
  const legacy = method === 'email' ? contact.emailEvidence : null;
  if (!value || !legacy || normalizedContactMethod(method, legacy.address) !== value) return null;
  return datedContactCheck({at:legacy.verifiedAt || legacy.at, recordedAt:legacy.at, result:'verified', source:legacy.source, evidence:legacy.detail});
}

export function readContactMethodEvidence(contact, method) {
  const display = String(contact[method] ?? '').trim(), value = normalizedContactMethod(method, display);
  const stored = contact.methodEvidence?.[method];
  const current = stored?.value === value ? stored : null;
  const legacy = legacyContactCheck(contact, method, value);
  const verification = (current?.verified?.result === 'verified' && datedContactCheck(current.verified)) || legacy;
  const checked = datedContactCheck(current?.checked) || (legacy && datedContactCheck({...legacy,at:contact.emailEvidence.at})) || verification;
  const stale = (stored && !current) || (method === 'email' && contact.emailEvidence &&
    normalizedContactMethod(method, contact.emailEvidence.address) !== value);
  const needsReview = checked?.result === 'unconfirmed' || (method === 'email'
    ? !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) || /invalid|bounc|undeliverable|failed|catch[- ]all|accept[- ]all/i.test(contact.emailStatus || '') ||
      (verification && /inferred|guess|suggest|unverified|unknown/i.test(contact.emailStatus || ''))
    : !/^\+?\d{7,16}(?:x\d+)?$/.test(value) || (contact.queueStatus === 'Needs phone correction' && !current?.checked && !current?.changedAt));
  let status = 'Unverified';
  if (!value) status = 'Missing';
  else if (needsReview) status = 'Needs review';
  else if (verification) status = 'Verified';
  else if (current?.changedAt || stale) status = 'Changed';
  return {method, value:display, status, changedAt:current?.changedAt || null,
    lastCheckedAt:checked?.at || null, lastVerifiedAt:verification?.at || null,
    recordedAt:checked?.recordedAt || checked?.at || null,sourceMessageId:checked?.sourceMessageId || '',verificationMessageId:verification?.sourceMessageId || '',
    source:checked?.source || '', evidence:checked?.evidence || '',
    verificationSource:verification?.source || '', verificationEvidence:verification?.evidence || ''};
}

export function writeContactMethodCheck(contact, method, checked, verifiedAt = checked.at) {
  const value = normalizedContactMethod(method, contact[method]);
  const saved = (contact.methodEvidence ||= {});
  const current = saved[method]?.value === value ? saved[method] : {value};
  const legacy = legacyContactCheck(contact,method,value);
  const prior = current.verified || legacy;
  const priorCheck = datedContactCheck(current.checked) || (legacy && datedContactCheck({...legacy,at:contact.emailEvidence.at}));
  const latest = priorCheck && Date.parse(priorCheck.at)>Date.parse(checked.at) ? priorCheck : checked;
  const verified = checked.result === 'verified' && (!prior || Date.parse(verifiedAt)>=Date.parse(prior.at)) ? {...checked,at:verifiedAt} : prior;
  saved[method] = {...current, checked:latest, ...(verified ? {verified} : {})};
}
