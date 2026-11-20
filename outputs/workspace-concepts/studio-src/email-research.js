import {contactHasAddress, emailCanBeUsed} from './email-address.js';
import {escapeHTML} from './visuals.js';

const emailPatterns = {
  'first.last': (first, last) => first + '.' + last,
  'first initial + last': (first, last) => first[0] + last,
  'first + last': (first, last) => first + last,
  'first': first => first,
  'first_last': (first, last) => first + '_' + last,
  'first + last initial': (first, last) => first + last[0],
  'last.first': (first, last) => last + '.' + first,
  'last + first initial': (first, last) => last + first[0]
};

const emailCohorts = {leadership: 'VP & executive', junior: 'Junior staff'};
const emailMinimumPeers = 7;
const emailMinimumShare = 0.75;
const emailFold = value => String(value ?? '').trim().toLowerCase();

function emailNameParts(contact) {
  const words = (contact.name || '').trim().split(/\s+/);
  const parts = contact.firstName && contact.lastName ? [contact.firstName, contact.lastName] : words;
  if (parts.length !== 2) return null;
  const pair = parts.map(emailFold);
  // An organisation may preserve, transliterate or drop punctuation and accents differently.
  return pair.every(part => /^[a-z]+$/.test(part)) ? pair : null;
}

function emailCohort(title) {
  const role = emailFold(title);
  if (/\b(assistant to|assistant vice president|associate (director|vice president))\b/.test(role)) return null;
  if (/\b(junior|jr\.?|graduate|trainee|apprentice|intern)\b/.test(role)) return 'junior';
  if (/\b(ceo|cfo|coo|cto|cio|cmo|cro|cpo|chro|ciso|svp|evp|vp|vice[ -]president|managing director|executive director|president)\b|\bchief .+ officer\b/.test(role)) return 'leadership';
  return null;
}

// Directory entries are editable CRM records. Neither cohort size nor format is assumed by the lookup.
export function addEmailExamples(d) {
  const account = d.accounts[1];
  account.domain = account.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.example';
  const directoryEntry = (group, index, firstName, lastName, title, format) => ({
    id: d.id + '-' + group + '-' + index, accountId: account.id, ownerId: d.team[0].id,
    firstName, lastName, name: firstName + ' ' + lastName, title, phone: '',
    email: format ? format(firstName, lastName).toLowerCase() + '@' + account.domain : '',
    source: 'Sample company directory', emailAllowed: false, callAllowed: false,
    timezone: 'Europe/London', need: '', lastTouch: 'Company directory import', queueStatus: 'Directory'
  });
  const leaders = [
    ['Ada', 'Frost', 'CEO'], ['Nia', 'Patel', 'CFO'], ['Owen', 'Birch', 'COO'],
    ['Lena', 'Marsh', 'CTO'], ['Evan', 'Park', 'VP of Sales'],
    ['Iris', 'Walsh', 'VP of Operations'], ['Hugo', 'Lin', 'VP of People']
  ];
  const juniorNames = [
    'Esme Lane', 'Jonah King', 'Maya Cole', 'Theo Lake', 'Amir Wood', 'Zoe Huang',
    'Pia Doyle', 'Sara Ward', 'Leah Moon', 'Noor Chen', 'Finn Kerr', 'Jude Fox',
    'Omar Singh', 'Freya Dale', 'Rosa Hale', 'Kai Bell', 'Milo Dean', 'Kit Price',
    'Ruby West', 'Tess Ford', 'Ari Kemp', 'Cleo Dunn', 'Ben Yu', 'Mina Grant',
    'Luis Snow', 'Dana Holt'
  ];
  const juniorTitles = ['Junior analyst', 'Graduate account coordinator', 'Junior designer', 'Operations trainee'];
  d.contacts.push(directoryEntry('junior-example', 0, 'Jamie', 'Rivers', 'Junior analyst', null));
  leaders.forEach(([first,last,title],index) => {
    d.contacts.push(directoryEntry('leadership', index, first, last, title, emailPatterns['first.last']));
  });
  juniorNames.forEach((name,index) => {
    const [first,last] = name.split(' ');
    const format = index === juniorNames.length - 1 ? emailPatterns['first.last'] : emailPatterns['first initial + last'];
    d.contacts.push(directoryEntry('junior', index, first, last, juniorTitles[index % juniorTitles.length], format));
  });
}

function emailEvidence(contacts, domain) {
  const rows = [];
  const namesByAddress = new Map();
  const addressesByName = new Map();
  const add = (groups, key, value) => {
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(value);
  };
  for (const person of contacts) {
    const address = emailFold(person.email);
    const [, local, host] = /^([^\s@]+)@([^\s@]+)$/.exec(address) || [];
    if (host !== domain || /[+]/.test(local)) continue;
    if (/^(info|support|sales|office|team|contact|hello|admin|billing|accounts|reception|press|careers|marketing|enquiries|noreply|no-reply)([._-].*)?$/.test(local)) continue;
    if (!emailCanBeUsed(person)) continue;
    const name = emailFold(person.name).replace(/\s+/g, ' ');
    if (!name) continue;
    add(namesByAddress, address, name);
    add(addressesByName, name, address);
    const parts = emailNameParts(person);
    const group = emailCohort(person.title);
    if (parts && group) rows.push({name, address, local, person, parts, group});
  }
  const groups = {leadership: [], junior: []};
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.address) || namesByAddress.get(row.address).size > 1 || addressesByName.get(row.name).size > 1) continue;
    seen.add(row.address);
    groups[row.group].push(row);
  }
  return groups;
}

function evaluateEmailCohort(group, rows, contact, domain, allContacts) {
  const formats = Object.entries(emailPatterns).map(([label,format]) => ({
    label, format, count: rows.filter(row => format(...row.parts) === row.local).length
  })).sort((a,b) => b.count - a.count);
  const best = formats[0];
  const peers = rows.map(row => row.person);
  const base = {group, peers, count: rows.length, matched: best.count, format: best.count ? best.label : '', matches: []};
  if (best.count) base.matches = rows.filter(row => best.format(...row.parts) === row.local).map(row => row.person.id);
  if (rows.length < emailMinimumPeers) return {...base, message: 'At least seven distinct colleagues in this group are needed. Found ' + rows.length + '.'};
  if (best.count < rows.length * emailMinimumShare || best.count === formats[1].count) {
    return {...base, message: 'The examples do not establish one format used by at least three quarters of this group.'};
  }
  const parts = emailNameParts(contact);
  if (!parts) return {...base, message: 'Confirm how the company spells this person’s given name and surname in email addresses.'};
  const candidate = best.format(...parts) + '@' + domain;
  if (candidate === emailFold(contact.email) && /bounc|undeliverable|invalid|failed/i.test(contact.emailStatus || '')) {
    return {...base, message: 'This format reproduces the address recorded as failed. Obtain a corrected address.'};
  }
  const owner = allContacts.find(c => c.id !== contact.id && contactHasAddress(c, candidate));
  if (owner) return {...base, message: 'This candidate is already saved to ' + owner.name + '. Review their record before using it.'};
  return {...base, candidate, message: best.count + ' of ' + rows.length + ' addresses use ' + best.label + '.'};
}

export function researchContactEmail(d, contact, requestedGroup = 'auto') {
  if (emailCanBeUsed(contact)) return {address: contact.email, message: 'Saved on this contact'};
  const company = d.accounts.find(a => a.id === contact.accountId);
  const domain = emailFold(company?.domain);
  const colleagues = d.contacts.filter(c => c.id !== contact.id && c.accountId === contact.accountId);
  const sameName = colleagues.filter(c => emailFold(c.name) === emailFold(contact.name) && emailFold(c.email));
  if (sameName.length) return {message: 'A same-name record at this company already has an address. Review the possible duplicate first.', peers: sameName};
  if (!domain) return {message: 'Add a company domain before comparing address patterns.'};
  const evidence = emailEvidence(colleagues, domain);
  const groups = Object.fromEntries(Object.keys(emailCohorts).map(key => [key, evaluateEmailCohort(key, evidence[key], contact, domain, d.contacts)]));
  const roleGroup = emailCohort(contact.title);
  const selected = Object.hasOwn(emailCohorts, requestedGroup) ? requestedGroup : roleGroup;
  const common = {company: company.name, domain, groups, roleGroup};
  if (selected) return {...common, ...groups[selected]};
  const [leaders, juniors] = Object.values(groups);
  if (leaders.candidate && leaders.candidate === juniors.candidate) {
    return {...common, candidate: leaders.candidate, message: 'Both groups suggest the same address.'};
  }
  return {...common, message: 'This job title does not identify a group. Review the groups separately before choosing a possible address.'};
}

function emailGroupPanel(contact, result, group) {
  const e = escapeHTML;
  const cohort = result.groups[group];
  const preferred = result.roleGroup === group;
  const alternate = result.roleGroup && !preferred;
  const count = cohort.count;
  const coverage = cohort.format ? cohort.matched + ' of ' + count + ' use ' + cohort.format : count + ' usable addresses';
  const exceptions = count - cohort.matched;
  let leadershipEvidence = '';
  if (group === 'leadership' && count) {
    const rank = title => /\b(svp|evp|vp|vice[ -]president)\b/i.test(title) ? 'VP' : 'C-level or executive';
    const split = ['VP', 'C-level or executive'].map(label => {
      const peers = cohort.peers.filter(peer => rank(peer.title) === label);
      const matched = peers.filter(peer => cohort.matches.includes(peer.id)).length;
      return peers.length ? label + ' · ' + matched + ' of ' + peers.length : '';
    }).filter(Boolean);
    leadershipEvidence = cohort.format ? '<p class="tiny muted">Records using ' + e(cohort.format) + '<br>' + split.map(e).join('<br>') + '</p>' : '';
  }
  const orderedPeers = [...cohort.peers].sort((a,b) => Number(cohort.matches.includes(a.id)) - Number(cohort.matches.includes(b.id)));
  const examples = orderedPeers.map(peer => {
    const isMatch = cohort.matches.includes(peer.id);
    return '<li><div><strong>' + e(peer.name) + '</strong> · ' + e(peer.title) + '<br>' + e(peer.email) + (peer.source ? ' · ' + e(peer.source) : '') + '</div><span>' + (isMatch ? 'Matches' : 'Other format') + '</span></li>';
  }).join('');
  return '<details class="email-research-group" name="email-group-' + e(contact.id) + '"' + (preferred ? ' open' : '') + '>' +
    '<summary><strong>' + e(emailCohorts[group]) + '</strong> <span>' + e(coverage) + '</span></summary><div class="email-research-body">' +
    (cohort.candidate ? '<p>' + (alternate ? 'Unverified alternative for this contact' : 'Unverified suggestion') + '<br><strong>' + e(cohort.candidate) + '</strong></p><button type="button" class="small" data-use-suggestion="' + e(cohort.candidate) + '">Use suggestion</button>' : '<p>' + e(cohort.message) + '</p>') +
    leadershipEvidence + (count ? '<details class="email-research-examples"><summary>Inspect ' + count + ' source records' + (cohort.format && exceptions ? ' · ' + exceptions + (exceptions === 1 ? ' exception' : ' exceptions') : '') + '</summary><ul tabindex="0" aria-label="Source records">' + examples + '</ul></details>' : '') +
    '</div></details>';
}

export function contactEmailResearch(d, contact, result = researchContactEmail(d, contact)) {
  const e = escapeHTML;
  const review = contact.email && !emailCanBeUsed(contact) ? '<p>Current entry requires review · ' + e(contact.email) + ' · ' + e(contact.emailStatus || 'Invalid format') + '</p>' : '';
  if (!result.groups) {
    const duplicateList = result.peers?.length ? '<ul>' + result.peers.map(c => '<li>' + e(c.name + ' · ' + c.email) + '</li>').join('') + '</ul>' : '';
    return review + '<p>' + e(result.message) + '</p>' + duplicateList;
  }
  const {leadership, junior} = result.groups;
  const differ = leadership.candidate && junior.candidate && leadership.candidate !== junior.candidate;
  let explanation = result.roleGroup ? 'Using the ' + emailCohorts[result.roleGroup] + ' group for this job title.' : result.message;
  if (!leadership.candidate && !junior.candidate) {
    explanation = result.roleGroup ? 'No suggestion yet. ' + result.groups[result.roleGroup].message :
      'Neither group has enough consistent evidence for a suggestion. Review their counts below.';
  }
  return review + '<p>' + e(explanation) + (differ ? ' The two groups use different formats.' : '') + '</p>' +
    Object.keys(emailCohorts).map(group => emailGroupPanel(contact, result, group)).join('') +
    '<p class="tiny muted">Suggestions need seven distinct colleagues and a format shared by at least 75% of that group. A match describes the company’s pattern. Mailbox delivery is unverified.</p>';
}
