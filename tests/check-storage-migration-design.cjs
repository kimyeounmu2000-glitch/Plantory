// Design-only browser prototype. Never loaded by the Plantory application.
const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT||'playwright');
const {execFileSync,spawnSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
async function install(page){await page.evaluate(()=>{
 window.sourceKey='plantory_full_mvp_v2';window.targetKey='plantory_full_mvp_v3';
 // Raw copy preserves unknown fields; full app compatibility validation remains required.
 window.propose=()=>localStorage.getItem(sourceKey);
 window.transfer=(expected,simulateChange=false)=>navigator.locks.request(targetKey+'-write',()=>{
  if(localStorage.getItem(targetKey)!==null)return 'target-exists';
  if(localStorage.getItem(sourceKey)!==expected)return 'source-changed';
  try{const v=JSON.parse(expected);if(!v||v.version!==2||!Array.isArray(v.items)||!v.awards||!v.growth||!v.settings)return 'invalid';}catch{return 'invalid'}
  localStorage.setItem(targetKey,expected);
  if(simulateChange)localStorage.setItem(sourceKey,expected+' '); // test-only competing writer
  if(localStorage.getItem(targetKey)!==expected)return 'readback-failed';
  return localStorage.getItem(sourceKey)===expected?'copied':'source-changed-after-copy';
 });
})}
(async()=>{
 // Reuse the real old/current app reproduction. Its known failure must remain visible.
 const baseline=spawnSync(process.execPath,[path.join(__dirname,'check-mixed-version-storage.cjs')],{encoding:'utf8',env:process.env});
 process.stdout.write(baseline.stdout);process.stdout.write(baseline.stderr);
 assert.equal(baseline.status,1);assert.match(baseline.stderr,/mixed old\/latest overwrite: awards/);assert.match(baseline.stderr,/current main save drops future celebration/);
 const old=execFileSync('git',['show','e469574:app/Plantory_3D_Integrated_original_models.html'],{cwd:root,maxBuffer:8*1024*1024});
 const b=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});
 try{
 const c=await b.newContext();await c.route('**/*',r=>r.fulfill({contentType:'text/html',body:r.request().url().endsWith('/old')?old:'<!doctype html><title>Migration design test only</title>'}));
 const p=await c.newPage();await p.goto('https://plantory.test/design');await install(p);
 const fixture={version:2,items:[{id:'t',type:'task',date:'2026-01-01',title:'Synthetic task',done:true},{id:'e',type:'event',date:'2026-01-01',time:'14:30',title:'Synthetic event',done:false}],awards:{'2026-01-01':'tulip'},growth:{'2026-01-01':3},settings:{hasOnboarded:true},celebration:{remaining:[1,2],last:0,days:{'2026-01-01':0}}};
 const raw=JSON.stringify(fixture);const setup=()=>p.evaluate(raw=>{localStorage.clear();localStorage.setItem(sourceKey,raw)},raw); // isolated fake origin only
 await setup();assert.equal(await p.evaluate(()=>transfer(propose())),'copied');
 assert.deepEqual(await p.evaluate(()=>[localStorage.getItem(sourceKey),localStorage.getItem(targetKey)]),[raw,raw]);
 await p.reload();await install(p);assert.equal(await p.evaluate(()=>transfer(propose())),'target-exists');
 const backup=await p.evaluate(()=>localStorage.getItem(targetKey));assert.deepEqual(JSON.parse(backup),fixture);
 const oldPage=await c.newPage();await oldPage.goto('https://plantory.test/old');await oldPage.locator('#fab').click();await oldPage.locator('#itemTitle').fill('Synthetic old edit');await oldPage.locator('#submitItem').click();await oldPage.locator('#editorOverlay').waitFor({state:'hidden'});
 assert.equal(await p.evaluate(()=>localStorage.getItem(targetKey)),raw);assert.notEqual(await p.evaluate(()=>localStorage.getItem(sourceKey)),raw);await oldPage.close();
 console.log('PASS design: actual old writer cannot overwrite new key; exact items/events/completion/growth/awards/celebration copy; reload no reimport');
 await setup();await p.evaluate(()=>{window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===targetKey)throw new DOMException('Synthetic quota','QuotaExceededError');return realSet.call(this,k,v)}});
 assert.equal(await p.evaluate(async()=>{try{await transfer(propose());return false}catch(e){return e.name}}),'QuotaExceededError');
 assert.deepEqual(await p.evaluate(()=>[localStorage.getItem(sourceKey),localStorage.getItem(targetKey)]),[raw,null]);
 await p.evaluate(()=>{Storage.prototype.setItem=realSet});assert.equal(await p.evaluate(()=>transfer(propose())),'copied');
 await setup();const q=await c.newPage();await q.goto('https://plantory.test/design');await install(q);
 const results=await Promise.all([p.evaluate(()=>transfer(propose())),q.evaluate(()=>transfer(propose()))]);assert.deepEqual(results.sort(),['copied','target-exists']);await q.close();
 assert.equal(await p.evaluate(()=>localStorage.getItem(sourceKey)),raw);
 await setup();assert.equal(await p.evaluate(raw=>{localStorage.setItem(sourceKey,raw+' ');return transfer(raw)},raw),'source-changed');assert.equal(await p.evaluate(()=>localStorage.getItem(targetKey)),null);
 await setup();assert.equal(await p.evaluate(()=>transfer(propose(),true)),'source-changed-after-copy');assert.equal(await p.evaluate(()=>localStorage.getItem(targetKey)),raw);
 console.log('PASS design: quota retains original, retry, two-tab single copy, source-change detection before/after copy');
 await setup();await p.evaluate(()=>localStorage.setItem(sourceKey,'{broken'));assert.equal(await p.evaluate(()=>transfer(propose())),'invalid');assert.deepEqual(await p.evaluate(()=>[localStorage.getItem(sourceKey),localStorage.getItem(targetKey)]),['{broken',null]);
 await setup();await p.evaluate(()=>localStorage.setItem(targetKey,'{broken target'));assert.equal(await p.evaluate(()=>transfer(propose())),'target-exists');assert.equal(await p.evaluate(()=>localStorage.getItem(targetKey)),'{broken target');
 await setup();await p.reload();await install(p);assert.equal(await p.evaluate(()=>localStorage.getItem(targetKey)),null);assert.equal(await p.evaluate(()=>localStorage.getItem(sourceKey)),raw);
 // Simulate interruption after atomic setItem and before UI acknowledgement.
 await p.evaluate(raw=>localStorage.setItem(targetKey,raw),raw);await p.reload();await install(p);assert.equal(await p.evaluate(()=>transfer(propose())),'target-exists');
 await p.evaluate(()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}));assert.equal(await p.evaluate(async()=>{try{await transfer(propose());return false}catch{return true}}),true);assert.equal(await p.evaluate(()=>localStorage.getItem(sourceKey)),raw);
 console.log('PASS design: corrupt original/target preserved, refresh before/after write, missing locks fails closed');
 const restore=await c.newPage();await restore.goto('https://plantory.test/restore');await restore.evaluate(raw=>localStorage.setItem('synthetic-restore-check',raw),backup);await restore.reload();assert.deepEqual(await restore.evaluate(()=>JSON.parse(localStorage.getItem('synthetic-restore-check'))),fixture);
 console.log('PASS raw JSON round trip (not application import compatibility)');await c.close();
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
