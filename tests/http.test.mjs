import test from 'node:test';import assert from 'node:assert/strict';
const url=process.env.TEST_URL||'http://localhost:3121';
async function post(body){const r=await fetch(url+'/api/handoffs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({actor:'adult-a',...body})});return {status:r.status,body:await r.json()};}
test('durable handoff remains a draft until both roles act',async()=>{
 let r=await post({action:'create',title:'Synthetic HTTP test repair visit'});assert.equal(r.status,200);let task=r.body.tasks[0];
 assert.equal('privateNote' in task,false);
 r=await post({action:'suggest',id:task.id,version:task.version,mode:'fixture'});assert.equal(r.status,200);task=r.body.tasks.find(t=>t.id===task.id);
 const outcomes=await Promise.all([post({action:'approve',id:task.id,version:task.version}),post({action:'approve',id:task.id,version:task.version})]);
 assert.equal(outcomes.filter(r=>r.status===200).length,1);
 task=(await (await fetch(url+'/api/handoffs')).json()).tasks.find(t=>t.id===task.id);assert.equal(task.state,'awaiting_recipient');
 assert.equal((await post({action:'accept',id:task.id,version:task.version})).status,400);
 r=await post({action:'accept',actor:'adult-b',id:task.id,version:task.version});assert.equal(r.status,200);
 assert.equal(r.body.tasks.find(t=>t.id===task.id).state,'accepted');
});
test('cross-origin mutations rejected',async()=>{const r=await fetch(url+'/api/handoffs',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{}'});assert.equal(r.status,403);});
