const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});try{
 const c=await b.newContext(),p=await c.newPage(),key='plantory_full_mvp_v3';await p.goto(pathToFileURL(path.resolve(__dirname,'../app/Plantory_3D_Integrated_original_models.html')).href);await p.locator('#helpDone').click();
 const state=page=>page.evaluate(k=>navigator.locks.request(k+'-write',()=>JSON.parse(localStorage.getItem(k))),key);
 let d=await state(p);assert.equal(Object.keys(d.awards).length,0);assert(await p.locator('#rewardCelebration').isHidden());
 await p.locator('#fab').click();await p.locator('#itemTitle').fill('Synthetic duplicate check');await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});
 const q=await c.newPage();await q.goto(p.url());await Promise.all([p.locator('#homeTasks .check').check(),q.locator('#homeTasks .check').check()]);
 d=await state(p);assert.equal(Object.keys(d.awards).length,1);assert.equal(Object.keys(d.celebration.days).length,1);assert.equal(d.celebration.remaining.length,39);
 const snapshot={awards:d.awards,celebration:d.celebration};
 for(const page of [p,q]){await page.reload();assert(await page.locator('#rewardCelebration').isHidden());await page.locator('#homeTasks .check').uncheck();await state(page);await page.locator('#homeTasks .check').check();d=await state(page);assert.deepEqual({awards:d.awards,celebration:d.celebration},snapshot);assert(await page.locator('#rewardCelebration').isHidden())}
 await p.reload();await p.locator('#fab').click();await p.locator('#itemTitle').fill('Later same-day goal');await p.locator('#submitItem').click();await p.locator('#editorOverlay').waitFor({state:'hidden'});await p.locator('#homeTasks .check:not(:checked)').check();d=await state(p);assert.deepEqual({awards:d.awards,celebration:d.celebration},snapshot);
 console.log('PASS zero tasks, simultaneous tabs, uncheck/recomplete, later same-day goal, reload: exactly one flower and one message');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
