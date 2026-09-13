// Opt-in integration evaluation. Never runs as part of the default tests.
// Uses synthetic calendars and calls only the planning backend; no messages or
// household mutations occur. The caller must supply server credentials privately.
import fs from 'node:fs';
const url = process.env.HOME_BACKEND_URL;
const token = process.env.HOME_BACKEND_TOKEN;
if (!url || !token) throw Error('Configure HOME_BACKEND_URL and HOME_BACKEND_TOKEN');
const requests = [
  'The repair visit moved to 4 PM. Who can be home?',
  'Can someone receive the plumber while Alex is at work?',
  'A parcel needs someone at home this afternoon.',
  'The electrician is arriving during working hours.',
  'Please help arrange who will greet the internet technician.',
  'I cannot be at home for the appliance repair appointment.',
  'We need an adult available for the furniture delivery.',
  'Who is free to answer the door for the maintenance visit?',
  'Find a household member available to receive a delivery.',
  'The washing machine engineer has changed the appointment.',
  'Alex has a work conflict. Suggest who could cover the home visit.',
  'Please suggest a handoff, but wait for the recipient to accept.',
  'Can you help with the meter inspection while I am away?',
  'Someone needs to let the authorised repair technician in.',
  'Find a replacement for the afternoon household appointment.',
  'I need help covering a scheduled home maintenance appointment.',
  'The new delivery slot conflicts with work. What is an option?',
  'Suggest who may be at home, without sending any invitations.',
  'We need a proposal for covering the air-conditioner service.',
  'Who can take responsibility for being home for the repair visit?',
];
const rows=[];
for (const [i,title] of requests.entries()) {
  const start=Date.now();
  try {
    const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({task:{id:`synthetic-eval-${i+1}`,title,version:1},calendars:[{actor:'adult-a',available:false,detail:'At work.'},{actor:'adult-b',available:true,detail:'At home, subject to explicit acceptance.'}]}),signal:AbortSignal.timeout(60000)});
    const d=await r.json();
    const names=(d.trace||[]).map(x=>x.tool);
    const pass=r.ok&&d.recipient==='adult-b'&&d.model==='amazon.nova-lite-v1:0'&&['get_task','list_availability','propose_handoff'].every(n=>names.includes(n));
    rows.push({title,status:r.status,pass,durationMs:Date.now()-start,result:d});
  } catch(e) {rows.push({title,pass:false,durationMs:Date.now()-start,error:e.message});}
  console.log(`Case ${i+1}/${requests.length}: ${rows.at(-1).pass?'pass':'fail'}`);
}
const report={testedAt:new Date().toISOString(),scope:'20 development-authored request paraphrases over one fixed synthetic availability scenario. Not held out; not an estimate of real household performance.',passed:rows.filter(x=>x.pass).length,total:rows.length,rows};
fs.mkdirSync('evidence',{recursive:true});
fs.writeFileSync('evidence/planner-evaluation-20260913.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,total:report.total}));
