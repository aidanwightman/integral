import assert from 'node:assert/strict';
import { signaturePhoneCandidate } from '../../outputs/workspace-concepts/studio-src/email-signature.js';

const person={id:'person',accountId:'company',name:'Sam Carter',phone:'+44 1632 960099'};
const mail={direction:'Incoming',contactId:'person',accountId:'company',at:'2026-01-02T00:00:00Z'};
const find=(body,overrides={})=>signaturePhoneCandidate({...mail,body,...overrides},person);
const own='Thanks,\nSam Carter\nDirect: +44 1632 960042';
assert.deepEqual(find(own),{value:'+44 1632 960042',matchesSaved:false});
assert.equal(find('Sam Carter\nTel: 0044 (1632) 960099').matchesSaved,true);
assert.equal(find(own+'\nTel: +44 1632 960043'),null);
assert.equal(find('Please call +44 1632 960042'),null);
assert.equal(find('Thanks,\nJess Fox\nDirect: +44 1632 960042'),null);
assert.equal(find('See below\nOn 1 January Jess wrote:\n'+own),null);
assert.equal(find(own,{direction:'Outgoing'}),null);
assert.equal(find(own,{contactId:'another'}),null);
assert.equal(find(own,{accountId:'another'}),null);
assert.equal(find(own,{at:'2099-11-17T09:00:00Z'}),null);
console.log('PASS labelled signature numbers, contact scope, quoted messages and ambiguous sources.');
