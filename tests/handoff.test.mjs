import test from 'node:test';
import assert from 'node:assert/strict';
import {createTask,readTask,propose,approve,respond,revise,revoke} from '../lib/handoff.mjs';
const now=Date.parse('2026-09-06T10:00:00Z');
const task=()=>createTask({id:'synthetic-repair',owner:'adult-a',title:'Be home for repair at 4 PM',privateNote:'Private household note'});
const draft=()=>propose(task(),{actor:'adult-a',version:1,recipient:'adult-b',now});
const ready=()=>approve(draft(),{actor:'adult-a',version:2,now});
test('HOME-01: edits invalidate an earlier approval',()=>{
 const d={...draft(),suggestion:{mode:'bedrock',reason:'Sam was available'}}, changed=revise(d,{actor:'adult-a',version:2,title:'Repair moved to 5 PM',now});
 assert.throws(()=>approve(changed,{actor:'adult-a',version:2,now}),/stale_version/);
 assert.equal(changed.state,'unassigned');
 assert.equal(changed.suggestion,null);
});
test('HOME-02: private notes are not shared before or after approval',()=>{
 assert.throws(()=>readTask(draft(),'adult-b'),/not_shared/);
 assert.equal('privateNote' in readTask(ready(),'adult-b'),false);
 assert.equal('audit' in readTask(ready(),'adult-b'),false);
 assert.equal(readTask(ready(),'adult-a').privateNote,'Private household note');
});
test('HOME-03: owner approval does not imply recipient acceptance',()=>{
 assert.equal(ready().state,'awaiting_recipient'); assert.equal(ready().responsible,null);
 assert.throws(()=>respond(ready(),{actor:'adult-a',version:3,accept:true,now}),/recipient_required/);
});
test('HOME-04: exact expiry boundary is rejected',()=>{
 const t=ready();
 assert.throws(()=>respond(t,{actor:'adult-b',version:3,accept:true,now:t.proposal.expires}),/expired_approval/);
});
test('HOME-05: correct recipient accepts responsibility, not task completion',()=>{
 const accepted=respond(ready(),{actor:'adult-b',version:3,accept:true,now});
 assert.equal(accepted.state,'accepted'); assert.equal(accepted.responsible,'adult-b');
 assert.throws(()=>respond(accepted,{actor:'adult-b',version:3,accept:true,now}),/stale_version/);
});
test('decline and revocation leave no assigned responsibility',()=>{
 const declined=respond(ready(),{actor:'adult-b',version:3,accept:false,now});
 assert.equal(declined.state,'declined'); assert.equal(declined.responsible,null);
 const revoked=revoke({...ready(),suggestion:{mode:'bedrock',reason:'Sam was available'}},{actor:'adult-a',version:3,now});
 assert.throws(()=>readTask(revoked,'adult-b'),/not_shared/);
 assert.equal(revoked.suggestion,null);
});
