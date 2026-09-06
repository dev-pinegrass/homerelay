const fs=require('node:fs'),path=require('node:path');
const template=JSON.parse(fs.readFileSync(path.join(__dirname,'template.json'),'utf8'));
template.Description='HomeRelay read-only Bedrock tool planning with explicit external approval.';
template.Resources.Backend.Properties.FunctionName='homerelay-bedrock-20260906';
template.Resources.Backend.Properties.Timeout=60;
template.Resources.Backend.Properties.Code.ZipFile=fs.readFileSync(path.join(__dirname,'index.cjs'),'utf8');
fs.writeFileSync(path.join(__dirname,'template.json'),JSON.stringify(template,null,2));
console.log('Prepared scoped HomeRelay backend template');

