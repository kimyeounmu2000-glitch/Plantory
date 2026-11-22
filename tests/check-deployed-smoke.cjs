// Explicit URL required; always uses fresh contexts with synthetic local data.
const {chromium}=require(process.env.PLANTORY_PLAYWRIGHT);
const fs=require('node:fs/promises'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const url=process.env.PLANTORY_DEPLOYED_URL,key='plantory_full_mvp_v3';
if(!url||new URL(url).origin!=='https://kimyeounmu2000-glitch.github.io')throw Error('Explicit Plantory development URL required');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
  const expected=hash(await fs.readFile('app/Plantory_3D_Integrated_original_models.html'));
  const browser=await chromium.launch({executablePath:process.env.PLANTORY_CHROME});
  const errors=[];
  try {
    const context=await browser.newContext({viewport:{width:375,height:740},reducedMotion:'reduce',acceptDownloads:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(url);assert.equal(response.status(),200);assert.equal(hash(await response.body()),expected);
    await page.waitForFunction(()=>document.activeElement.id==='helpHeading');
    await page.keyboard.press('Shift+Tab');await page.keyboard.press('Enter');
    await page.locator('#helpOverlay').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.activeElement.id),'fab');
    assert(await page.evaluate(()=>isSecureContext&&!!navigator.locks));
    const stale=await context.newPage();await stale.goto(url);
    await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.id==='itemTitle');
    await page.keyboard.type('Synthetic deployed task');await page.keyboard.press('Enter');
    await page.locator('#editorOverlay').waitFor({state:'hidden'});
    await stale.locator('#fab').click();await stale.locator('#itemTitle').fill('Synthetic stale draft');await stale.locator('#submitItem').click();
    await stale.waitForFunction(()=>document.querySelector('#toast').textContent.includes('저장하지 않았어요'));
    assert.equal(await stale.locator('#itemTitle').inputValue(),'Synthetic stale draft');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).items.length,key),1);
    await stale.close();
    await page.locator('#homeTasks .check').focus();await page.keyboard.press('Space');
    await page.waitForFunction(()=>document.activeElement.id==='rewardClose');await page.keyboard.press('Enter');
    assert(await page.locator('#homeTasks .check').evaluate(e=>e===document.activeElement));
    await page.locator('#homeTasks .check').uncheck();await page.locator('#homeTasks .check').check();
    const before=await page.evaluate(k=>navigator.locks.request(k+'-write',()=>localStorage.getItem(k)),key);
    const data=JSON.parse(before);assert.equal(Object.keys(data.awards).length,1);assert.equal(Object.keys(data.celebration.days).length,1);
    await page.reload();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),before);
    assert.equal(await page.locator('#plantGraphic canvas').count(),1);
    for(const width of [320,375,390,430,510]){
      await page.setViewportSize({width,height:740});
      for(const view of ['day','month','home','garden']){
        await page.locator(`[data-nav="${view}"]`).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }
      await page.locator('#backHome').click();await page.locator('[data-nav="collection"]').click();
      assert.equal(await page.locator('#speciesGrid .species-card').count(),6);
      assert.equal(await page.locator('#speciesGrid .locked img').count(),0);await page.locator('#backHome').click();
    }
    await page.locator('#settingsOpen').click();
    const downloadPromise=page.waitForEvent('download');await page.locator('#exportData').click();const download=await downloadPromise;
    const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));
    for(const field of ['items','awards','growth','celebration'])assert.deepEqual(backup[field],data[field]);
    const broken=await browser.newContext({acceptDownloads:true,reducedMotion:'reduce'}),bad=await broken.newPage();
    await bad.goto(url);const original='{Synthetic damaged JSON';await bad.evaluate(([k,v])=>localStorage.setItem(k,v),[key,original]);await bad.reload();
    await bad.locator('[data-close="helpOverlay"]').click();await bad.locator('#settingsOpen').click();
    const recoveryPromise=bad.waitForEvent('download');await bad.locator('#exportData').click();const recovery=await recoveryPromise;
    assert.match(recovery.suggestedFilename(),/recovery-original.*\.txt$/);
    assert.deepEqual(await fs.readFile(await recovery.path()),Buffer.from(original));assert.equal(await bad.evaluate(k=>localStorage.getItem(k),key),original);
    await broken.close();await context.close();assert.deepEqual(errors,[]);
    console.log(JSON.stringify({status:'PASS',browser:await browser.version(),htmlSHA256:expected,source:'real Pages HTTP response; no app route replacement',checks:['initial focus','keyboard task/reward/return','stale tab rejection and draft','reload','single daily award/message','five viewports and screens','six collection species','3D canvas','JSON backup','corrupt original download']}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
