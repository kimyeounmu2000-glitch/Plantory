const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT),fs=require('node:fs/promises'),assert=require('node:assert/strict');
(async()=>{
 const original=await fs.readFile('app/Plantory_3D_Integrated_original_models.html','utf8');
 const html=original,url=process.env.PLANTORY_DEPLOYED_URL;
 if(url&&new URL(url).origin!=='https://kimyeounmu2000-glitch.github.io')throw Error('Unexpected deployment origin');
 const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});
 try{
  const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:375,height:568}});
  if(!url)await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:html}));
  // Observe native lock completion without modifying application bytes or storage.
  await context.addInitScript(()=>{
   window.saveRaceLocks=new Set();const request=navigator.locks.request.bind(navigator.locks);
   navigator.locks.request=(...args)=>{
    const result=request(...args);window.saveRaceLocks.add(result);
    result.then(()=>window.saveRaceLocks.delete(result),()=>window.saveRaceLocks.delete(result));return result;
   };
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url||'https://plantory.test');
  if(url)assert.deepEqual(await response.body(),await fs.readFile('app/Plantory_3D_Integrated_original_models.html'));
  await page.locator('#helpDone').click();
  const raw=()=>page.evaluate(()=>localStorage.getItem('plantory_full_mvp_v3'));
  await page.locator('#fab').click();await page.locator('#submitItem').click();assert(await page.locator('#editorOverlay').isVisible());
  await page.locator('#itemTitle').fill('한글 🌱 '+ '가'.repeat(80));await page.locator('#itemNote').fill('메'.repeat(500));
  await page.evaluate(()=>{window.ready=false;navigator.locks.request('plantory_full_mvp_v3-write',()=>new Promise(resolve=>{window.unlock=resolve;window.ready=true}))});
  await page.waitForFunction(()=>window.ready);
  await page.locator('#submitItem').evaluate(e=>{e.click();e.click();document.querySelector('#editorForm').requestSubmit()});
  assert(await page.locator('#submitItem').isDisabled());
  await page.evaluate(()=>window.unlock());await page.waitForFunction(()=>!document.querySelector('#submitItem').disabled);
  await page.locator('#editorOverlay').waitFor({state:'hidden'});
  let data=JSON.parse(await raw());assert.equal(data.items.length,1);assert.equal(data.items[0].note.length,500);
  await page.locator('#homeTasks .edit-item').click();await page.locator('#itemTitle').fill('Synthetic retry');
  await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('synthetic quota')}});
  const before=await raw();await page.locator('#submitItem').click();await page.waitForFunction(()=>!document.querySelector('#submitItem').disabled);
  assert(await page.locator('#editorOverlay').isVisible());assert.equal(await raw(),before);
  await page.evaluate(()=>Storage.prototype.setItem=window.originalSet);await page.locator('#submitItem').click();await page.locator('#editorOverlay').waitFor({state:'hidden'});
  await page.reload();assert.equal(JSON.parse(await raw()).items[0].title,'Synthetic retry');
  const hold=async()=>{
   await page.evaluate(()=>{window.ready=false;navigator.locks.request('plantory_full_mvp_v3-write',()=>new Promise(resolve=>{window.unlock=resolve;window.ready=true}))});
   await page.waitForFunction(()=>window.ready);
  };
  const drain=async()=>{await page.evaluate(()=>window.unlock());await page.waitForFunction(()=>window.saveRaceLocks.size===0&&!document.querySelector('#submitItem').disabled)};
  const cancel=async()=>{page.once('dialog',d=>d.accept());await page.keyboard.press('Escape');await page.locator('#editorOverlay').waitFor({state:'hidden'})};
  // R2/R5: stale completion must not touch a newer unsaved editor or focus.
  await page.locator('#fab').click();await page.locator('#itemTitle').fill('Cancelled A');await hold();await page.locator('#submitItem').click();await cancel();
  await page.locator('#fab').click();await page.locator('#itemTitle').fill('Unsaved B');await page.locator('#itemNote').focus();
  const prior=await raw();await drain();assert.equal(await raw(),prior);
  assert.equal(await page.locator('#itemTitle').inputValue(),'Unsaved B');assert(await page.locator('#editorOverlay').isVisible());
  assert(await page.locator('#itemNote').evaluate(e=>e===document.activeElement));assert(await page.locator('#submitItem').isEnabled());await cancel();
  // R3: B's explicit request must remain accepted while canceled A drains.
  await page.locator('#fab').click();await page.locator('#itemTitle').fill('Cancelled second A');await hold();await page.locator('#submitItem').click();await cancel();
  await page.locator('#fab').click();await page.locator('#itemTitle').fill('Accepted B');await page.locator('#submitItem').click();assert(await page.locator('#submitItem').isDisabled());
  await drain();await page.locator('#editorOverlay').waitFor({state:'hidden'});
  data=JSON.parse(await raw());assert.deepEqual(data.items.map(x=>x.title).sort(),['Accepted B','Synthetic retry']);assert.equal(new Set(data.items.map(x=>x.id)).size,2);
  // Immutable payload guard: editing a pending draft does not silently persist it.
  await page.locator('#fab').click();await page.locator('#itemTitle').fill('Pending original');await hold();await page.locator('#submitItem').click();
  await page.locator('#itemTitle').fill('Changed draft');const unchanged=await raw();await drain();assert.equal(await raw(),unchanged);
  assert(await page.locator('#editorOverlay').isVisible());assert(await page.locator('#submitItem').isEnabled());await cancel();
  // R6/R8: normal edit after canceled work and reload preserve identity and content.
  await page.locator('#homeTasks .edit-item').first().click();await page.locator('#itemTitle').fill('Ordinary edit');await page.locator('#submitItem').click();await page.locator('#editorOverlay').waitFor({state:'hidden'});
  const final=await raw();await page.reload();assert.equal(await raw(),final);assert.equal(JSON.parse(final).items.length,2);assert(JSON.parse(final).items.some(x=>x.title==='Ordinary edit'));
  // A pending deletion must not adopt another record's editor identity.
  await page.locator('#homeTasks .edit-item').first().click();await hold();await page.locator('#deleteItem').click();
  await page.keyboard.press('Escape');await page.locator('#editorOverlay').waitFor({state:'hidden'});
  await page.locator('#homeTasks .edit-item').last().click();
  const acceptDeletion=d=>d.accept();page.on('dialog',acceptDeletion);await drain();page.off('dialog',acceptDeletion);assert.equal(await raw(),final);
  await page.keyboard.press('Escape');await page.locator('#editorOverlay').waitFor({state:'hidden'});
  // Cancellation takes effect before the non-reduced-motion close animation finishes.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#fab').click();await page.locator('#itemTitle').fill('Cancel during animation');await hold();await page.locator('#submitItem').click();
  page.once('dialog',d=>d.accept());await page.keyboard.press('Escape');await drain();assert.equal(await raw(),final);
  await page.locator('#editorOverlay').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('PASS R1/R2/R3/R4/R5/R6/R8: double submit, session cancel, independent B, failure/retry, focus, edit, reload; changed-draft guard; Korean/emoji/long input. R7 uses existing storage suites.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
