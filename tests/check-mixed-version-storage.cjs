// Safety gate: mixed-version loss is a failure, never a passing known issue.
const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'), key='plantory_full_mvp_v2', url='https://plantory.test/app';
 // Historical baseline retained for before/after comparison.
 const latest=execFileSync('git',['show','b0587b1:app/Plantory_3D_Integrated_original_models.html'],{cwd:root,maxBuffer:8*1024*1024});
 const old=execFileSync('git',['show','e469574:app/Plantory_3D_Integrated_original_models.html'],{cwd:root,maxBuffer:8*1024*1024});
 const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});
 const failures=[];
 try {
 const c=await browser.newContext({acceptDownloads:true});
 await c.route('**/*',r=>r.fulfill({contentType:'text/html',body:r.request().url().endsWith('?old')?old:latest}));
 const p=await c.newPage();await p.goto(url);
 const fixture={version:2,items:[{id:'base',type:'task',date:'2026-01-01',title:'Synthetic baseline',done:false}],awards:{},growth:{},settings:{hasOnboarded:true}};
 await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,fixture]);await p.reload();
 const stale=await c.newPage();await stale.goto(url+'?old');
 await p.locator('#fab').click();await p.locator('#itemTitle').fill('Synthetic latest task');await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
 await p.locator('#homeTasks .check').check();
 const before=await p.evaluate(k=>navigator.locks.request(k+'-write',()=>JSON.parse(localStorage.getItem(k))),key);
 assert(Object.keys(before.awards).length===1);assert(Object.keys(before.growth).length>0);
 const dl=p.waitForEvent('download');await p.locator('#exportData').evaluate(el=>el.click());const backup=await fs.readFile(await (await dl).path());
 const backupState=JSON.parse(backup);assert.deepEqual(backupState.items,before.items);assert.deepEqual(backupState.awards,before.awards);
 await stale.locator('#fab').click();await stale.locator('#itemTitle').fill('Synthetic old writer');await stale.locator('#submitItem').click();await stale.locator('#editorOverlay').waitFor({state:'hidden'});
 const after=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 for(const field of ['items','awards','growth']){
  if(JSON.stringify(after[field])!==JSON.stringify(before[field])) failures.push('mixed old/latest overwrite: '+field);
 }
 assert(!after.items.some(x=>x.title==='Synthetic latest task'));await p.reload();assert(!await p.locator('#homeTasks').getByText('Synthetic latest task',{exact:true}).count());
 assert.deepEqual(JSON.parse(backup),backupState);console.log('PASS separately downloaded JSON survives overwrite; reload confirms record loss');
 // Future metadata fixture only: no application schema is changed.
 const future={...before,celebration:{remaining:[1,2],last:0,days:{[Object.keys(before.awards)[0]]:0}}};
 await p.evaluate(([k,s])=>localStorage.setItem(k,JSON.stringify(s)),[key,future]);await p.reload();
 await p.locator('#fab').click();await p.locator('#itemTitle').fill('Synthetic future metadata check');await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
 const saved=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 if(!saved.celebration)failures.push('current main save drops future celebration metadata');
 await c.close();
 }finally{await browser.close()}
 for(const failure of failures)console.error('FAIL',failure);
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
